'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeys(data.apiKeys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [router]);

  const createApiKey = async () => {
    if (!newKeyLabel.trim()) return;

    setCreating(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label: newKeyLabel }),
      });

      const data = await res.json();
      if (res.ok) {
        setApiKeys([...apiKeys, data.apiKey]);
        setNewKeyLabel('');
        alert(`API Key created: ${data.apiKey.key}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setApiKeys(apiKeys.map(key =>
          key.id === id ? { ...key, isActive: !isActive } : key
        ));
      }
    } catch (error) {
      alert('Failed to update API key');
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== id));
      }
    } catch (error) {
      alert('Failed to delete API key');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ConversionBird - API Keys</h1>
            </div>
            <div className="flex items-center">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700">← Back to Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Create New API Key</h3>
              <div className="mt-5 flex">
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="API Key Label"
                  className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  onClick={createApiKey}
                  disabled={creating || !newKeyLabel.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <li key={key.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{key.label}</p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleApiKey(key.id, key.isActive)}
                          className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded ${
                            key.isActive
                              ? 'text-red-700 bg-red-100 hover:bg-red-200'
                              : 'text-green-700 bg-green-100 hover:bg-green-200'
                          }`}
                        >
                          {key.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {apiKeys.length === 0 && (
                  <li className="px-6 py-4 text-center text-gray-500">
                    No API keys found. Create your first API key above.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}