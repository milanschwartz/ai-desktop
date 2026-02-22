import { create } from 'zustand';

interface ZenModeState {
  isActive: boolean;
  currentClaimId: string | null;
  pendingClaims: Array<{ id: string; content: string; messageId: string }>;
  activate: (claimId: string) => void;
  deactivate: () => void;
  addPendingClaim: (claim: { id: string; content: string; messageId: string }) => void;
  removePendingClaim: (claimId: string) => void;
}

export const useZenModeStore = create<ZenModeState>((set) => ({
  isActive: false,
  currentClaimId: null,
  pendingClaims: [],
  activate: (claimId) => set({ isActive: true, currentClaimId: claimId }),
  deactivate: () => set({ isActive: false, currentClaimId: null }),
  addPendingClaim: (claim) =>
    set((state) => ({
      pendingClaims: [...state.pendingClaims, claim],
    })),
  removePendingClaim: (claimId) =>
    set((state) => ({
      pendingClaims: state.pendingClaims.filter((c) => c.id !== claimId),
    })),
}));
