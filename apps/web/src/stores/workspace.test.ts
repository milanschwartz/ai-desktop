import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../stores/workspace';
import type { Workspace } from '@ai-desktop/shared';

const createMockWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'workspace-123',
  name: 'Test Workspace',
  description: 'A test workspace',
  defaultViewMode: 'structured',
  settings: {
    agentAutoParticipate: false,
    claimValidationRequired: false,
  },
  createdBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Workspace Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useWorkspaceStore.setState({
      currentWorkspace: null,
      workspaces: [],
    });
  });

  describe('Initial State', () => {
    it('should have no current workspace initially', () => {
      expect(useWorkspaceStore.getState().currentWorkspace).toBeNull();
    });

    it('should have empty workspaces list initially', () => {
      expect(useWorkspaceStore.getState().workspaces).toEqual([]);
    });
  });

  describe('setCurrentWorkspace', () => {
    it('should set current workspace', () => {
      const workspace = createMockWorkspace();

      useWorkspaceStore.getState().setCurrentWorkspace(workspace);

      expect(useWorkspaceStore.getState().currentWorkspace).toEqual(workspace);
    });

    it('should clear current workspace when set to null', () => {
      const workspace = createMockWorkspace({ description: null });

      useWorkspaceStore.getState().setCurrentWorkspace(workspace);
      useWorkspaceStore.getState().setCurrentWorkspace(null);

      expect(useWorkspaceStore.getState().currentWorkspace).toBeNull();
    });
  });

  describe('setWorkspaces', () => {
    it('should set workspaces list', () => {
      const workspaces = [
        createMockWorkspace({ id: 'workspace-1', name: 'Workspace 1', description: null }),
        createMockWorkspace({
          id: 'workspace-2',
          name: 'Workspace 2',
          defaultViewMode: 'creative',
        }),
      ];

      useWorkspaceStore.getState().setWorkspaces(workspaces);

      expect(useWorkspaceStore.getState().workspaces).toEqual(workspaces);
    });

    it('should replace existing workspaces', () => {
      const workspaces1 = [
        createMockWorkspace({ id: 'workspace-1', name: 'Workspace 1', description: null }),
      ];

      const workspaces2 = [
        createMockWorkspace({
          id: 'workspace-2',
          name: 'Workspace 2',
          defaultViewMode: 'creative',
        }),
      ];

      useWorkspaceStore.getState().setWorkspaces(workspaces1);
      useWorkspaceStore.getState().setWorkspaces(workspaces2);

      expect(useWorkspaceStore.getState().workspaces).toEqual(workspaces2);
    });
  });
});
