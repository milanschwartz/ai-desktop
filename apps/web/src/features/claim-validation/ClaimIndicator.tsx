import { useState } from 'react';
import { useZenModeStore } from '../../stores/zenMode';

interface ClaimIndicatorProps {
  claimId: string;
  content: string;
  messageId: string;
  status: 'unvalidated' | 'approved' | 'denied' | 'needs_info';
}

export function ClaimIndicator({ claimId, content, messageId, status }: ClaimIndicatorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { activate, addPendingClaim } = useZenModeStore();

  const statusClass = {
    unvalidated: 'claim-unvalidated',
    approved: 'claim-approved',
    denied: 'claim-denied',
    needs_info: 'claim-needs-info',
  }[status];

  const handleClick = () => {
    if (status === 'unvalidated') {
      addPendingClaim({ id: claimId, content, messageId });
      activate(claimId);
    }
  };

  return (
    <span
      className={`relative inline ${statusClass}`}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onClick={handleClick}
    >
      {content}

      {/* Hover preview */}
      {showPreview && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-surface-900 text-white text-sm rounded-lg shadow-lg z-50 min-w-[200px] max-w-[300px]">
          <div className="font-medium mb-1">
            {status === 'unvalidated' && '⚠️ Needs validation'}
            {status === 'approved' && '✓ Verified fact'}
            {status === 'denied' && '✗ Denied'}
            {status === 'needs_info' && '? Needs more info'}
          </div>
          <p className="text-surface-300 text-xs">
            {status === 'unvalidated' && 'Click to validate in Zen Mode'}
            {status === 'approved' && 'This claim has been verified'}
            {status === 'denied' && 'This claim was found to be incorrect'}
            {status === 'needs_info' && 'Additional sources needed'}
          </p>
        </div>
      )}
    </span>
  );
}
