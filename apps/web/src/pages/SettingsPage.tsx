export function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display name</label>
              <input type="text" className="input" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" className="input" placeholder="your@email.com" />
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select className="input">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </section>

        {/* Zen Mode section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Zen Mode</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Zen Mode</p>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Focus on validating claims one at a time
                </p>
              </div>
              <button className="relative w-12 h-6 bg-primary-600 rounded-full">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </button>
            </div>
          </div>
        </section>

        {/* Security section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <button className="btn-secondary">Change password</button>
            <button className="btn-secondary">Set up passkey</button>
          </div>
        </section>
      </div>
    </div>
  );
}
