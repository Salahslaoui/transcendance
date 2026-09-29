"use client";
import React, { useState, useEffect } from 'react';
import LoginForm from './login-form';
import SignupForm from './signup-form';
import { Dispatch, SetStateAction } from 'react';
import { useIsAuth } from '@/contexts/user-provider';
import { useRouter } from 'next/navigation';
import { LocalStorageManager } from '@/helpers/info';


export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login');


    return (
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="flex flex-col border border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-lg backdrop-blur-xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold mb-4 text-blue-400 drop-shadow"> PING PONG SHOWDOWN </h1>
            <p className="text-blue-200 text-lg font-mono"> Ready to play? </p>
          </div>
          <div className="mb-8">
            <div className="flex rounded-xl border border-gray-600 bg-gray-800/50 p-1">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 px-6 rounded-lg transition-all font-bold text-lg ${
                  activeTab === 'login'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-blue-300 hover:text-blue-100 hover:bg-gray-700/50'
                }`}
              >
                LOGIN
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 px-6 rounded-lg transition-all font-bold text-lg ${
                  activeTab === 'signup'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-blue-300 hover:text-blue-100 hover:bg-gray-700/50'
                }`}
              >
                SIGN UP
              </button>
            </div>
          </div>
          <div className="flex-1">
            {activeTab === 'login' && (
              <div className="space-y-6 px-4 py-6 shadow-inner">
                <LoginForm />
              </div>
            )}
            {activeTab === 'signup' && (
              <div className="space-y-6 px-4 py-6 shadow-inner">
                <SignupForm />
              </div>
            )}
          </div>
        </div>
      </div>
    );
}
