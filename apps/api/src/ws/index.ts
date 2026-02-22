import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { db } from '../db/index.js';
import { workspaceMembers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { WS_EVENTS, WEBSOCKET_TICKET_EXPIRY_MS } from '@ai-desktop/shared';

// Store active connections per workspace
const workspaceConnections = new Map<string, Set<WebSocket>>();
const userWorkspaces = new Map<WebSocket, Set<string>>();

// One-time WebSocket tickets (short-lived, single-use)
// Key: ticket string, Value: { userId, expiresAt }
const wsTickets = new Map<string, { userId: string; expiresAt: number }>();

/** Issue a one-time WS ticket for an authenticated user (called from REST endpoint). */
export function issueWsTicket(userId: string): string {
  const ticket = crypto.randomUUID();
  wsTickets.set(ticket, { userId, expiresAt: Date.now() + WEBSOCKET_TICKET_EXPIRY_MS });
  return ticket;
}

/** Consume and validate a one-time WS ticket. Returns userId or null. */
function consumeWsTicket(ticket: string): string | null {
  const entry = wsTickets.get(ticket);
  wsTickets.delete(ticket); // Always delete — single use
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.userId;
}

export function setupWebSocket(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const socket = connection.socket;
      let userId: string | null = null;

      // Extract one-time ticket from query string (NOT the access token)
      const url = new URL(req.url ?? '', `http://${req.headers.host}`);
      const ticket = url.searchParams.get('ticket');

      if (!ticket) {
        socket.close(4001, 'Authentication required — provide a WS ticket');
        return;
      }

      // Consume one-time ticket
      const ticketUserId = consumeWsTicket(ticket);
      if (!ticketUserId) {
        socket.close(4001, 'Invalid or expired ticket');
        return;
      }

      userId = ticketUserId;
      userWorkspaces.set(socket, new Set());

      // Send connection confirmation
      socket.send(
        JSON.stringify({
          event: 'connected',
          data: { userId },
        })
      );

      // Handle incoming messages
      socket.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await handleWebSocketMessage(socket, userId!, message);
        } catch {
          socket.send(
            JSON.stringify({
              event: 'error',
              data: { message: 'Invalid message format' },
            })
          );
        }
      });

      // Handle disconnect
      socket.on('close', () => {
        // Remove from all workspaces
        const workspaces = userWorkspaces.get(socket);
        if (workspaces) {
          for (const workspaceId of workspaces) {
            const connections = workspaceConnections.get(workspaceId);
            if (connections) {
              connections.delete(socket);
              if (connections.size === 0) {
                workspaceConnections.delete(workspaceId);
              }
            }
          }
        }
        userWorkspaces.delete(socket);
      });
    });
  });
}

async function handleWebSocketMessage(
  socket: WebSocket,
  userId: string,
  message: { event: string; data: unknown }
) {
  const { event, data } = message;

  switch (event) {
    case WS_EVENTS.JOIN_WORKSPACE: {
      const { workspaceId } = data as { workspaceId: string };

      // Verify user is a member
      const membership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        ),
      });

      if (!membership) {
        socket.send(
          JSON.stringify({
            event: 'error',
            data: { message: 'Not a member of this workspace' },
          })
        );
        return;
      }

      // Add to workspace connections
      if (!workspaceConnections.has(workspaceId)) {
        workspaceConnections.set(workspaceId, new Set());
      }
      workspaceConnections.get(workspaceId)!.add(socket);

      // Track user's workspaces
      userWorkspaces.get(socket)?.add(workspaceId);

      socket.send(
        JSON.stringify({
          event: 'joined_workspace',
          data: { workspaceId },
        })
      );
      break;
    }

    case WS_EVENTS.LEAVE_WORKSPACE: {
      const { workspaceId } = data as { workspaceId: string };

      const connections = workspaceConnections.get(workspaceId);
      if (connections) {
        connections.delete(socket);
      }
      userWorkspaces.get(socket)?.delete(workspaceId);

      socket.send(
        JSON.stringify({
          event: 'left_workspace',
          data: { workspaceId },
        })
      );
      break;
    }

    case WS_EVENTS.TYPING_START:
    case WS_EVENTS.TYPING_STOP: {
      const { workspaceId, channelId } = data as { workspaceId: string; channelId: string };
      broadcastToWorkspace(
        workspaceId,
        {
          event: event,
          data: { userId, channelId },
        },
        socket
      );
      break;
    }

    case WS_EVENTS.CANVAS_NODE_MOVE: {
      const { workspaceId, nodeId, x, y } = data as {
        workspaceId: string;
        nodeId: string;
        x: number;
        y: number;
      };
      broadcastToWorkspace(
        workspaceId,
        {
          event: WS_EVENTS.CANVAS_UPDATED,
          data: { nodeId, x, y },
        },
        socket
      );
      break;
    }

    default:
      socket.send(
        JSON.stringify({
          event: 'error',
          data: { message: `Unknown event: ${event}` },
        })
      );
  }
}

// Broadcast to all connections in a workspace
export function broadcastToWorkspace(
  workspaceId: string,
  message: unknown,
  excludeSocket?: WebSocket
) {
  const connections = workspaceConnections.get(workspaceId);
  if (!connections) return;

  const messageStr = JSON.stringify(message);

  for (const socket of connections) {
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      socket.send(messageStr);
    }
  }
}

// Broadcast a new message to workspace
export function broadcastMessage(
  workspaceId: string,
  message: { id: string; channelId: string; content: string; authorType: string; authorId: string }
) {
  broadcastToWorkspace(workspaceId, {
    event: WS_EVENTS.MESSAGE_CREATED,
    data: message,
  });
}

// Broadcast agent typing
export function broadcastAgentTyping(workspaceId: string, agentId: string, channelId: string) {
  broadcastToWorkspace(workspaceId, {
    event: WS_EVENTS.AGENT_TYPING,
    data: { agentId, channelId },
  });
}

// Broadcast agent response
export function broadcastAgentResponse(
  workspaceId: string,
  message: { id: string; channelId: string; content: string; authorId: string }
) {
  broadcastToWorkspace(workspaceId, {
    event: WS_EVENTS.AGENT_RESPONSE,
    data: message,
  });
}
