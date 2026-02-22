import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User, Workspace, Channel, Message, Agent } from '@ai-desktop/shared';

// Auth hooks
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<{ token: string; user: User }>('/auth/login', credentials);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: {
      email: string;
      username: string;
      password: string;
      displayName?: string;
    }) => {
      const response = await api.post<{ token: string; user: User }>('/auth/register', data);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
  });
}

// Workspace hooks
export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await api.get<{ workspaces: Workspace[] }>('/workspaces');
      if (!response.success) throw new Error(response.error.message);
      return response.data.workspaces;
    },
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      const response = await api.get<Workspace>(`/workspaces/${id}`);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post<Workspace>('/workspaces', data);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Channel hooks
export function useChannels(workspaceId: string) {
  return useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      const response = await api.get<{ channels: Channel[] }>(
        `/workspaces/${workspaceId}/channels`
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data.channels;
    },
    enabled: !!workspaceId,
  });
}

// Message hooks
export function useMessages(channelId: string) {
  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const response = await api.get<{ items: Message[] }>(`/messages/channels/${channelId}`);
      if (!response.success) throw new Error(response.error.message);
      return response.data.items;
    },
    enabled: !!channelId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      const response = await api.post<Message>(`/messages/channels/${channelId}`, { content });
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

// Agent hooks
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get<{ agents: Agent[] }>('/agents');
      if (!response.success) throw new Error(response.error.message);
      return response.data.agents;
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      model: string;
      systemPrompt?: string;
      openrouterApiKey: string;
    }) => {
      const response = await api.post<Agent>('/agents', data);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

// Canvas types
interface CanvasNode {
  id: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  style: { color?: string; shape?: string };
}

interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

// Canvas hooks
export function useCanvas(workspaceId: string) {
  return useQuery({
    queryKey: ['canvas', workspaceId],
    queryFn: async () => {
      const response = await api.get<{ nodes: CanvasNode[]; edges: CanvasEdge[] }>(
        `/canvas/workspaces/${workspaceId}/canvas`
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    enabled: !!workspaceId,
  });
}

// Claim types
interface Claim {
  id: string;
  content: string;
  status: string;
}

// Claims hooks
export function useClaims(workspaceId: string) {
  return useQuery({
    queryKey: ['claims', workspaceId],
    queryFn: async () => {
      const response = await api.get<{ claims: Claim[] }>(
        `/claims/workspaces/${workspaceId}/claims`
      );
      if (!response.success) throw new Error(response.error.message);
      return response.data.claims;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { status: string; denialReason?: string; correction?: string };
    }) => {
      const response = await api.patch<Claim>(`/claims/update`, data);
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
}
