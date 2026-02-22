import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { RATE_LIMITS } from '@ai-desktop/shared';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import workspacesRoutes from './routes/workspaces.js';
import agentsRoutes from './routes/agents.js';
import channelsRoutes from './routes/channels.js';
import messagesRoutes from './routes/messages.js';
import canvasRoutes from './routes/canvas.js';
import claimsRoutes from './routes/claims.js';
import filesRoutes from './routes/files.js';

// Import WebSocket handler
import { setupWebSocket } from './ws/index.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  },
});

// Set up Zod validation
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Security headers
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'blob:', 'data:'],
      connectSrc: ["'self'", 'wss:', 'https://openrouter.ai'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
});

// Cookies
const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret && process.env.NODE_ENV === 'production') {
  throw new Error('COOKIE_SECRET environment variable is required in production');
}
await fastify.register(cookie, {
  secret: cookieSecret ?? 'dev-secret-do-not-use-in-production',
  hook: 'onRequest',
});

// Rate limiting
await fastify.register(rateLimit, {
  max: RATE_LIMITS.GENERAL.max,
  timeWindow: RATE_LIMITS.GENERAL.windowMs,
  cache: 10000,
  redis: process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined,
});

// OpenAPI / Swagger
await fastify.register(swagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'AI Desktop API',
      description: 'API for AI Desktop - a collaborative environment for humans and AI agents',
      version: '0.1.0',
    },
    servers: [{ url: 'http://localhost:8080', description: 'Development server' }],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'users', description: 'User management' },
      { name: 'workspaces', description: 'Workspace management' },
      { name: 'agents', description: 'AI agent management' },
      { name: 'channels', description: 'Channel management' },
      { name: 'messages', description: 'Message management' },
      { name: 'canvas', description: 'Canvas management' },
      { name: 'claims', description: 'Claim validation' },
      { name: 'files', description: 'File management' },
    ],
  },
  transform: jsonSchemaTransform,
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    deepLinking: true,
  },
});

// WebSocket
await fastify.register(websocket);

// Health check
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(usersRoutes, { prefix: '/api/v1/users' });
await fastify.register(workspacesRoutes, { prefix: '/api/v1/workspaces' });
await fastify.register(agentsRoutes, { prefix: '/api/v1/agents' });
await fastify.register(channelsRoutes, { prefix: '/api/v1/channels' });
await fastify.register(messagesRoutes, { prefix: '/api/v1/messages' });
await fastify.register(canvasRoutes, { prefix: '/api/v1/canvas' });
await fastify.register(claimsRoutes, { prefix: '/api/v1/claims' });
await fastify.register(filesRoutes, { prefix: '/api/v1/files' });

// WebSocket handler
setupWebSocket(fastify);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;

  // Log server errors
  if (statusCode >= 500) {
    request.log.error(error);
  }

  // Handle Zod validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.validation,
      },
    } as const);
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: error.message,
    },
  } as const);
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 8080);
    const host = process.env.HOST ?? '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 AI Desktop API running at http://${host}:${port}`);
    console.log(`📚 API Docs available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
