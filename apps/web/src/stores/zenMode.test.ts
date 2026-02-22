import { describe, it, expect, beforeEach } from 'vitest';
import { useZenModeStore } from '../stores/zenMode';

describe('Zen Mode Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useZenModeStore.setState({
      isActive: false,
      currentClaimId: null,
      pendingClaims: [],
    });
  });

  describe('Initial State', () => {
    it('should not be active initially', () => {
      expect(useZenModeStore.getState().isActive).toBe(false);
    });

    it('should have no current claim initially', () => {
      expect(useZenModeStore.getState().currentClaimId).toBeNull();
    });

    it('should have empty pending claims initially', () => {
      expect(useZenModeStore.getState().pendingClaims).toEqual([]);
    });
  });

  describe('activate', () => {
    it('should activate zen mode with claim ID', () => {
      const claimId = 'claim-123';

      useZenModeStore.getState().activate(claimId);

      expect(useZenModeStore.getState().isActive).toBe(true);
      expect(useZenModeStore.getState().currentClaimId).toBe(claimId);
    });
  });

  describe('deactivate', () => {
    it('should deactivate zen mode', () => {
      useZenModeStore.setState({ isActive: true, currentClaimId: 'claim-123' });

      useZenModeStore.getState().deactivate();

      expect(useZenModeStore.getState().isActive).toBe(false);
      expect(useZenModeStore.getState().currentClaimId).toBeNull();
    });
  });

  describe('addPendingClaim', () => {
    it('should add claim to pending list', () => {
      const claim = {
        id: 'claim-123',
        content: 'Test claim content',
        messageId: 'message-456',
      };

      useZenModeStore.getState().addPendingClaim(claim);

      expect(useZenModeStore.getState().pendingClaims).toContainEqual(claim);
    });

    it('should append to existing claims', () => {
      const claim1 = { id: 'claim-1', content: 'Claim 1', messageId: 'msg-1' };
      const claim2 = { id: 'claim-2', content: 'Claim 2', messageId: 'msg-2' };

      useZenModeStore.getState().addPendingClaim(claim1);
      useZenModeStore.getState().addPendingClaim(claim2);

      expect(useZenModeStore.getState().pendingClaims).toHaveLength(2);
    });
  });

  describe('removePendingClaim', () => {
    it('should remove claim from pending list', () => {
      const claim = {
        id: 'claim-123',
        content: 'Test claim content',
        messageId: 'message-456',
      };

      useZenModeStore.getState().addPendingClaim(claim);
      useZenModeStore.getState().removePendingClaim(claim.id);

      expect(useZenModeStore.getState().pendingClaims).not.toContainEqual(claim);
    });

    it('should not error when removing non-existent claim', () => {
      expect(() => {
        useZenModeStore.getState().removePendingClaim('non-existent');
      }).not.toThrow();
    });
  });
});
