import { Link, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace';
import { useWorkspaces } from '../hooks/useApi';
import type { Workspace } from '@ai-desktop/shared';

export function Sidebar() {
  const location = useLocation();
  const { currentWorkspace } = useWorkspaceStore();
  const { data: workspaces } = useWorkspaces();

  return (
    <aside className="w-64 sidebar flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold text-lg">Desktop</span>
        </Link>
      </div>

      {/* Workspace selector */}
      <div className="p-3 border-b border-surface-200 dark:border-surface-800">
        <select
          className="input text-sm"
          value={currentWorkspace?.id ?? ''}
          onChange={(e) => {
            const workspace = workspaces?.find((w: Workspace) => w.id === e.target.value);
            if (workspace) {
              useWorkspaceStore.getState().setCurrentWorkspace(workspace);
            }
          }}
        >
          <option value="">Select workspace</option>
          {workspaces?.map((w: Workspace) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavItem
          to={currentWorkspace ? `/workspace/${currentWorkspace.id}` : '/'}
          icon="💬"
          label="Chat"
          active={location.pathname.includes('/channel') || location.pathname === '/'}
        />
        <NavItem
          to={currentWorkspace ? `/workspace/${currentWorkspace.id}/canvas` : '/'}
          icon="🎨"
          label="Canvas"
          active={location.pathname.includes('/canvas')}
        />
        <NavItem to="/agents" icon="🤖" label="Agents" active={location.pathname === '/agents'} />
        <NavItem
          to="/settings"
          icon="⚙️"
          label="Settings"
          active={location.pathname === '/settings'}
        />
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
          <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
            👤
          </div>
          <span className="truncate">User</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
