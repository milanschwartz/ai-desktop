import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';

export function Header() {
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <header className="h-14 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {currentWorkspace && <h1 className="font-semibold">{currentWorkspace.name}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* View mode toggle */}
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
          <button className="px-3 py-1 text-sm rounded-md bg-white dark:bg-surface-700 shadow-sm">
            Structured
          </button>
          <button className="px-3 py-1 text-sm rounded-md text-surface-600 dark:text-surface-400">
            Creative
          </button>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-medium">
            {user?.displayName?.[0] ?? user?.username?.[0] ?? '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
