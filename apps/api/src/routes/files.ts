import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';
import { createWriteStream, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function filesRoutes(fastify: FastifyInstance) {
  // Upload file
  fastify.post(
    '/upload',
    {
      schema: {
        tags: ['files'],
        consumes: ['multipart/form-data'],
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              fileName: z.string(),
              fileType: z.string(),
              fileSize: z.number(),
              storagePath: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      await authenticate(request);

      const data = await request.file();

      if (!data) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'No file uploaded' },
        });
      }

      // Validate file size
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          return reply.status(HTTP_STATUS.BAD_REQUEST).send({
            success: false,
            error: { code: ERROR_CODES.FILE_TOO_LARGE, message: 'File size exceeds 10MB limit' },
          });
        }
        chunks.push(chunk);
      }

      // Validate file type
      const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(HTTP_STATUS.BAD_REQUEST).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_FILE_TYPE, message: 'File type not allowed' },
        });
      }

      // Generate storage path
      const fileId = randomUUID();
      const ext = extname(data.filename ?? 'file');
      const storagePath = join(UPLOAD_DIR, `${fileId}${ext}`);

      // Write file
      const buffer = Buffer.concat(chunks);
      await pipeline(buffer, createWriteStream(storagePath));

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          id: fileId,
          fileName: data.filename ?? 'unknown',
          fileType: data.mimetype,
          fileSize: totalSize,
          storagePath,
        },
      });
    }
  );

  // Download file
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['files'],
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      // Require authentication to download files
      await authenticate(request);
      const { id } = request.params;

      // Find file in uploads directory
      const files = await import('node:fs/promises');
      const uploadFiles = await files.readdir(UPLOAD_DIR);
      const file = uploadFiles.find((f) => f.startsWith(id));

      if (!file) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'File not found' },
        });
      }

      return reply.sendFile(file, UPLOAD_DIR);
    }
  );

  // Delete file
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['files'],
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      // Require authentication to delete files
      await authenticate(request);
      const { id } = request.params;

      // Find and delete file
      const files = await import('node:fs/promises');
      const uploadFiles = await files.readdir(UPLOAD_DIR);
      const file = uploadFiles.find((f) => f.startsWith(id));

      if (!file) {
        return reply.status(HTTP_STATUS.NOT_FOUND).send({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'File not found' },
        });
      }

      const filePath = join(UPLOAD_DIR, file);
      unlinkSync(filePath);

      return { success: true };
    }
  );
}
