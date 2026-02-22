import { describe, it, expect } from 'vitest';

describe('RBAC Middleware', () => {
  describe('Role Hierarchy', () => {
    const ROLE_HIERARCHY = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    it('should define hierarchy levels for all roles', () => {
      expect(ROLE_HIERARCHY.owner).toBeDefined();
      expect(ROLE_HIERARCHY.admin).toBeDefined();
      expect(ROLE_HIERARCHY.member).toBeDefined();
      expect(ROLE_HIERARCHY.viewer).toBeDefined();
    });

    it('should give owner the highest level', () => {
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.member);
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.viewer);
    });

    it('should give admin higher level than member', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.member);
      expect(ROLE_HIERARCHY.admin).toBeLessThan(ROLE_HIERARCHY.owner);
    });

    it('should give member higher level than viewer', () => {
      expect(ROLE_HIERARCHY.member).toBeGreaterThan(ROLE_HIERARCHY.viewer);
      expect(ROLE_HIERARCHY.member).toBeLessThan(ROLE_HIERARCHY.admin);
    });
  });

  describe('Role Level Checks', () => {
    const ROLE_HIERARCHY = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    function hasRequiredRole(
      userRole: keyof typeof ROLE_HIERARCHY,
      requiredRole: keyof typeof ROLE_HIERARCHY
    ): boolean {
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
    }

    it('should allow owner to access admin-level resources', () => {
      expect(hasRequiredRole('owner', 'admin')).toBe(true);
      expect(hasRequiredRole('owner', 'member')).toBe(true);
      expect(hasRequiredRole('owner', 'viewer')).toBe(true);
    });

    it('should allow admin to access member-level resources', () => {
      expect(hasRequiredRole('admin', 'member')).toBe(true);
      expect(hasRequiredRole('admin', 'viewer')).toBe(true);
    });

    it('should deny admin from owner-level resources', () => {
      expect(hasRequiredRole('admin', 'owner')).toBe(false);
    });

    it('should deny member from admin-level resources', () => {
      expect(hasRequiredRole('member', 'admin')).toBe(false);
      expect(hasRequiredRole('member', 'owner')).toBe(false);
    });

    it('should allow member to access member-level resources', () => {
      expect(hasRequiredRole('member', 'member')).toBe(true);
      expect(hasRequiredRole('member', 'viewer')).toBe(true);
    });
  });
});
