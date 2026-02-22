import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  CreateWorkspaceSchema,
  CreateAgentSchema,
  CreateMessageSchema,
  WorkspaceRoleSchema,
  ViewModeSchema,
  ClaimStatusSchema,
} from '../validation';

describe('Validation Schemas', () => {
  describe('WorkspaceRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(WorkspaceRoleSchema.parse('owner')).toBe('owner');
      expect(WorkspaceRoleSchema.parse('admin')).toBe('admin');
      expect(WorkspaceRoleSchema.parse('member')).toBe('member');
      expect(WorkspaceRoleSchema.parse('viewer')).toBe('viewer');
    });

    it('should reject invalid roles', () => {
      expect(() => WorkspaceRoleSchema.parse('superadmin')).toThrow();
      expect(() => WorkspaceRoleSchema.parse('user')).toThrow();
    });
  });

  describe('ViewModeSchema', () => {
    it('should accept valid view modes', () => {
      expect(ViewModeSchema.parse('structured')).toBe('structured');
      expect(ViewModeSchema.parse('creative')).toBe('creative');
    });

    it('should reject invalid view modes', () => {
      expect(() => ViewModeSchema.parse('list')).toThrow();
      expect(() => ViewModeSchema.parse('grid')).toThrow();
    });
  });

  describe('ClaimStatusSchema', () => {
    it('should accept valid claim statuses', () => {
      expect(ClaimStatusSchema.parse('unvalidated')).toBe('unvalidated');
      expect(ClaimStatusSchema.parse('approved')).toBe('approved');
      expect(ClaimStatusSchema.parse('denied')).toBe('denied');
      expect(ClaimStatusSchema.parse('needs_info')).toBe('needs_info');
    });

    it('should reject invalid claim statuses', () => {
      expect(() => ClaimStatusSchema.parse('pending')).toThrow();
      expect(() => ClaimStatusSchema.parse('rejected')).toThrow();
    });
  });

  describe('RegisterSchema', () => {
    it('should accept valid registration data', () => {
      const result = RegisterSchema.parse({
        username: 'testuser',
        displayName: 'Test User',
        password: 'securepassword123',
      });

      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.password).toBe('securepassword123');
    });

    it('should reject username with uppercase letters', () => {
      expect(() =>
        RegisterSchema.parse({
          username: 'TestUser',
          displayName: 'Test User',
          password: 'securepassword123',
        })
      ).toThrow();
    });

    it('should reject username with special characters', () => {
      expect(() =>
        RegisterSchema.parse({
          username: 'test-user',
          displayName: 'Test User',
          password: 'securepassword123',
        })
      ).toThrow();
    });

    it('should reject short username', () => {
      expect(() =>
        RegisterSchema.parse({
          username: 'ab',
          displayName: 'Test User',
          password: 'securepassword123',
        })
      ).toThrow();
    });

    it('should reject short password', () => {
      expect(() =>
        RegisterSchema.parse({
          username: 'testuser',
          displayName: 'Test User',
          password: 'short',
        })
      ).toThrow();
    });
  });

  describe('LoginSchema', () => {
    it('should accept valid login data', () => {
      const result = LoginSchema.parse({
        username: 'testuser',
        password: 'anypassword',
      });

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('anypassword');
    });

    it('should reject empty username', () => {
      expect(() =>
        LoginSchema.parse({
          username: '',
          password: 'password',
        })
      ).toThrow();
    });

    it('should reject empty password', () => {
      expect(() =>
        LoginSchema.parse({
          username: 'testuser',
          password: '',
        })
      ).toThrow();
    });
  });

  describe('CreateWorkspaceSchema', () => {
    it('should accept valid workspace data', () => {
      const result = CreateWorkspaceSchema.parse({
        name: 'My Workspace',
        description: 'A test workspace',
      });

      expect(result.name).toBe('My Workspace');
      expect(result.description).toBe('A test workspace');
    });

    it('should accept workspace without description', () => {
      const result = CreateWorkspaceSchema.parse({
        name: 'My Workspace',
      });

      expect(result.name).toBe('My Workspace');
      expect(result.description).toBeUndefined();
    });

    it('should reject empty name', () => {
      expect(() =>
        CreateWorkspaceSchema.parse({
          name: '',
        })
      ).toThrow();
    });

    it('should reject name longer than 200 characters', () => {
      expect(() =>
        CreateWorkspaceSchema.parse({
          name: 'a'.repeat(201),
        })
      ).toThrow();
    });
  });

  describe('CreateAgentSchema', () => {
    it('should accept valid agent data', () => {
      const result = CreateAgentSchema.parse({
        name: 'Atlas',
        model: 'anthropic/claude-3.5-sonnet',
        systemPrompt: 'You are a helpful assistant.',
        openrouterApiKey: 'sk-or-xxx',
      });

      expect(result.name).toBe('Atlas');
      expect(result.model).toBe('anthropic/claude-3.5-sonnet');
      expect(result.openrouterApiKey).toBe('sk-or-xxx');
    });

    it('should accept agent with optional fields', () => {
      const result = CreateAgentSchema.parse({
        name: 'Atlas',
        model: 'anthropic/claude-3.5-sonnet',
        openrouterApiKey: 'sk-or-xxx',
        systemPrompt: 'You are a helpful assistant.',
        capabilities: ['chat', 'code'],
      });

      expect(result.systemPrompt).toBe('You are a helpful assistant.');
      expect(result.capabilities).toEqual(['chat', 'code']);
    });

    it('should reject empty name', () => {
      expect(() =>
        CreateAgentSchema.parse({
          name: '',
          model: 'anthropic/claude-3.5-sonnet',
          openrouterApiKey: 'sk-or-xxx',
        })
      ).toThrow();
    });

    it('should reject empty model', () => {
      expect(() =>
        CreateAgentSchema.parse({
          name: 'Atlas',
          model: '',
          openrouterApiKey: 'sk-or-xxx',
        })
      ).toThrow();
    });
  });

  describe('CreateMessageSchema', () => {
    it('should accept valid message data', () => {
      const result = CreateMessageSchema.parse({
        content: 'Hello, world!',
      });

      expect(result.content).toBe('Hello, world!');
    });

    it('should accept message with parent (thread reply)', () => {
      const result = CreateMessageSchema.parse({
        content: 'This is a reply',
        parentId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.parentId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject empty content', () => {
      expect(() =>
        CreateMessageSchema.parse({
          content: '',
        })
      ).toThrow();
    });

    it('should reject content longer than 50000 characters', () => {
      expect(() =>
        CreateMessageSchema.parse({
          content: 'a'.repeat(50001),
        })
      ).toThrow();
    });
  });
});
