import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/auth';
import type { User } from '@ai-desktop/shared';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: null,
  settings: {
    defaultViewMode: 'structured',
    theme: 'system',
    claimHighlightStyle: 'subtle',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
    });
  });

  describe('Initial State', () => {
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have null token initially', () => {
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
    });

    it('should not be loading initially', () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user', () => {
      const user = createMockUser();

      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('should clear user when set to null', () => {
      const user = createMockUser();

      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should set isLoading to false when user is set', () => {
      useAuthStore.setState({ isLoading: true });

      useAuthStore.getState().setUser(createMockUser());

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setToken', () => {
    it('should set token', () => {
      const token = 'test-jwt-token';

      useAuthStore.getState().setToken(token);

      expect(useAuthStore.getState().token).toBe(token);
    });

    it('should clear token when set to null', () => {
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setToken(null);

      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear user and token', () => {
      useAuthStore.setState({
        user: createMockUser(),
        token: 'test-token',
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });
  });
});
