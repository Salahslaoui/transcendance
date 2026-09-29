import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/helpers/info';
import WebsocketService from '@/services/ws';
import Api from '@/helpers/axios';
import { FcGoogle } from "react-icons/fc";
import { useIsAuth, useUser } from '@/contexts/user-provider';
import { User } from '@/helpers/types';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const {setUser, refetchUser} = useUser();
  const {setIsAuth} = useIsAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [redirected, setRedirected] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const router = useRouter();

useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth');
  const isGoogle = urlParams.get('google');
  const token = urlParams.get('token');
  const userParam = urlParams.get('user');
  const errorType = urlParams.get('error');

  if (authSuccess === 'success' && isGoogle === 'true' && token && userParam) {
    try {
      const parsedData = JSON.parse(userParam);
      const userData = parsedData.user || parsedData;

      if (!userData || !userData.id) {
        throw new Error('Invalid user data');
      }
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, '/');
      refetchUser().then(() => {
        router.push("/dashboard");
      }).catch(err => {
        console.error('Failed to refetch user:', err);
        setError('Authentication failed');
      });
    } catch (err) {
      console.error('Auth parse error:', err);
      setError('Authentication failed');
      window.history.replaceState({}, document.title, '/');
    }
  } else if (authSuccess === 'failed') {
    if (errorType === 'email_exists_local') {
      setError('This email is already registered with a regular account. Please log in using your username and password instead of Google.');
    } else {
      setError('Google authentication failed. Please try again.');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, [router, refetchUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
        const response = await axios.post(`${BACKEND_URL}/auth/login`, {
        username: formData.username,
        password: formData.password,
        twoFACode: requires2FA ? twoFACode : undefined
      }, {
		withCredentials: true,
	  });
      if (response.data.success && response.data.details) {
        if (response.data.details.requires2FA) {
          setRequires2FA(true);
          setMessage(response.data.details.message || 'Please enter your 2FA code');
          setLoading(false);
          return;
        }
        const token = response.data.details.token;
        const user = response.data.details.user;
        localStorage.setItem('token', token);
        setUser(user as User);
        setIsAuth(true);
        setMessage(response.data.details.message || 'Login successful! Redirecting...');
        router.push("/dashboard");
      } else
        setError('Login failed. Please try again.');
      	setFormData({
        	username: '',
        	password: '',
      	});
        setTwoFACode('');
        setRequires2FA(false);
      	// if (!redirected) {
        // 	WebsocketService.connect();
      	// }
    } catch (err: any) {
      if (err.response && err.response.data) {
        if (err.response.data.success === false && err.response.data.details?.error)
          setError(err.response.data.details.error);
        else if (err.response.data.error)
          setError(err.response.data.error);
        else
          setError('Login failed. Please try again.');
      } else
        setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-300 mb-4 text-center">Account Access</h2>
      <hr className="border-blue-800 mb-6" />
      {error && (
        <div className="mb-6 max-w-full">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
            <p className="text-red-400 text-sm break-words whitespace-pre-wrap leading-relaxed text-center"> {error} </p>
          </div>
        </div>
      )}
      {message && (
        <div className="mb-6 max-w-full">
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
            <p className="text-green-400 text-sm break-words whitespace-pre-wrap leading-relaxed text-center"> {message} </p>
          </div>
        </div>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative">
          <label className="block text-lg font-semibold text-blue-300 mb-2"> USERNAME </label>
          <input
            name="username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            required
            className="w-full pl-4 px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow"
            placeholder="Enter your username"
          />
        </div>
        <div className="relative">
          <label className="block text-lg font-semibold text-blue-300 mb-2"> PASSWORD </label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="w-full pl-4 px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow"
            placeholder="Enter your password"
          />
        </div>

        {requires2FA && (
          <div className="relative">
            <label className="block text-lg font-semibold text-blue-300 mb-2"> 2FA CODE </label>
            <input
              name="twoFACode"
              type="text"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              className="w-full pl-4 px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow text-center text-xl tracking-widest"
              placeholder="000000"
              autoFocus
            />
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          {requires2FA && (
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFACode('');
                setError('');
                setMessage('');
              }}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors font-bold shadow"
            >
              Back
            </button>
          )}
          {!requires2FA && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-gray-700 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors font-bold shadow flex items-center justify-center"
            >
              <FcGoogle className="mr-2 text-xl" /> Sign in with Google
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-extrabold shadow-lg disabled:opacity-50"
          >
            {loading ? 'LOGGING IN...' : requires2FA ? 'VERIFY CODE' : 'START GAME'}
          </button>
        </div>
      </form>
    </div>
  );
}
