
"use client";
import React, {useState} from 'react'
import Security from './security';
import Picture from './Picture';
import Account from './account';
import Blocked from './blocked';
import { useUser } from '@/contexts/user-provider';

const Settings = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {user} = useUser();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'blocked'>('account');

    if (!user)
        return <h1>Loading</h1>

  return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <div className="flex flex-col md:flex-row border border-gray-700 rounded-xl shadow-2xl p-2 md:p-6 w-full h-full max-w-6xl  backdrop-blur-xl">
			<Picture setError={setError} setSuccess={setSuccess} />
            <div className="flex-1 flex flex-col w-full overflow-hidden">
              <h1 className="text-4xl font-extrabold mb-6 text-center text-blue-400 drop-shadow">Settings</h1>
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    activeTab === 'account'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Account Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    activeTab === 'security'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('blocked')}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    activeTab === 'blocked'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Blocked Users
                </button>
              </div>
              {error && (
                <div className="mb-6 max-w-full">
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                    <p className="text-red-400 text-sm break-words whitespace-pre-wrap leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              )}
              {success && (
                <div className="mb-6 max-w-full">
                  <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
                    <p className="text-green-400 text-sm break-words whitespace-pre-wrap leading-relaxed">
                      {success}
                    </p>
                  </div>
                </div>
              )}
              {activeTab === 'account' && (
				<Account setError={setError} setSuccess={setSuccess} />
              )}
              {activeTab === 'security' && (
				<Security setError={setError} setSuccess={setSuccess} />
              )}
              {activeTab === "blocked" && (
				<Blocked setError={setError} setSuccess={setSuccess} />
              )

              }
            </div>
          </div>
      </div>
    );
  }

export default Settings
