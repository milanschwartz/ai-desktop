import { useZenModeStore } from '../../stores/zenMode';
import { useUpdateClaim } from '../../hooks/useApi';

export function ZenMode() {
  const { isActive, currentClaimId, pendingClaims, deactivate, removePendingClaim } =
    useZenModeStore();
  const updateClaim = useUpdateClaim();

  if (!isActive || !currentClaimId) return null;

  const currentClaim = pendingClaims.find((c) => c.id === currentClaimId);
  if (!currentClaim) return null;

  const handleApprove = async () => {
    await updateClaim.mutateAsync({
      data: { status: 'approved' },
    });
    removePendingClaim(currentClaim.id);

    // Move to next claim or deactivate
    const remaining = pendingClaims.filter((c) => c.id !== currentClaim.id);
    if (remaining.length > 0 && remaining[0]) {
      useZenModeStore.getState().activate(remaining[0].id);
    } else {
      deactivate();
    }
  };

  const handleDeny = async (reason: string) => {
    await updateClaim.mutateAsync({
      data: { status: 'denied', denialReason: reason },
    });
    removePendingClaim(currentClaim.id);

    const remaining = pendingClaims.filter((c) => c.id !== currentClaim.id);
    if (remaining.length > 0 && remaining[0]) {
      useZenModeStore.getState().activate(remaining[0].id);
    } else {
      deactivate();
    }
  };

  const handleNeedsInfo = async () => {
    await updateClaim.mutateAsync({
      data: { status: 'needs_info' },
    });
    removePendingClaim(currentClaim.id);

    const remaining = pendingClaims.filter((c) => c.id !== currentClaim.id);
    if (remaining.length > 0 && remaining[0]) {
      useZenModeStore.getState().activate(remaining[0].id);
    } else {
      deactivate();
    }
  };

  return (
    <div className="zen-mode overflow-y-auto">
      <div className="zen-mode-card">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-surface-600 dark:text-surface-400 mb-2">
            <span>Claim Validation Progress</span>
            <span>{pendingClaims.length} remaining</span>
          </div>
          <div className="h-2 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${((pendingClaims.length - 1) / pendingClaims.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Claim content */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Verify this claim:</h2>
          <p className="text-lg p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border-l-4 border-amber-400">
            {currentClaim.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleApprove}
            disabled={updateClaim.isPending}
            className="btn bg-green-600 text-white hover:bg-green-700"
          >
            ✓ Approve as fact
          </button>
          <button
            onClick={handleNeedsInfo}
            disabled={updateClaim.isPending}
            className="btn-secondary"
          >
            ? Needs more information
          </button>
          <button
            onClick={() => {
              const reason = prompt('Why is this claim denied?');
              if (reason) handleDeny(reason);
            }}
            disabled={updateClaim.isPending}
            className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
          >
            ✗ Deny claim
          </button>
        </div>

        {/* Exit */}
        <button
          onClick={deactivate}
          className="mt-6 text-sm text-surface-600 dark:text-surface-400 hover:underline"
        >
          Exit Zen Mode
        </button>
      </div>
    </div>
  );
}
