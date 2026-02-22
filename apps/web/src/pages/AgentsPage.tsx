import { useState } from 'react';
import { useAgents, useCreateAgent } from '../hooks/useApi';

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const createAgent = useCreateAgent();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [model, setModel] = useState('anthropic/claude-3.5-sonnet');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const agentData = {
      name,
      model,
      openrouterApiKey: apiKey,
      ...(systemPrompt ? { systemPrompt } : {}),
    };

    await createAgent.mutateAsync(agentData);

    setShowCreate(false);
    setName('');
    setApiKey('');
    setSystemPrompt('');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-200 dark:bg-surface-800 rounded" />
          <div className="h-32 bg-surface-200 dark:bg-surface-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Create Agent
        </button>
      </div>

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Agent</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Agent name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">OpenRouter API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input"
                placeholder="sk-or-..."
                required
              />
              <p className="text-xs text-surface-500 mt-1">
                Your API key is encrypted and stored securely
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">System Prompt (optional)</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="input min-h-[100px]"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={createAgent.isPending}>
                {createAgent.isPending ? 'Creating...' : 'Create Agent'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {agents?.map((agent) => (
          <div key={agent.id} className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xl">
              🤖
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                {agent.model} • {agent.capabilities.join(', ')}
              </p>
            </div>
            <div
              className={`px-2 py-1 rounded text-xs ${agent.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}`}
            >
              {agent.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        ))}

        {agents?.length === 0 && (
          <div className="text-center py-12 text-surface-600 dark:text-surface-400">
            <p className="text-4xl mb-4">🤖</p>
            <p>No agents yet. Create your first agent to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
