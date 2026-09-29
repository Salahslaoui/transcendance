import React, { useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/helpers/info';

export default function SignupForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      setLoading(false);
      return;
    }
    try {
        const response = await axios.post(`${BACKEND_URL}/auth/signup`, {
        email: formData.email,
        password: formData.password,
        username: formData.username
      });
      if (response.data.success)
        setMessage(response.data.details.message || 'Account created successfully! You can now login.');
      else
        setError(response.data.details.error || 'Signup failed');
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (err: any) {
		if (err.response && err.response.data) {
			let msg = err.response.data.details?.error || err.response.data.error || "Signup failed. Please try again.";
    		if (msg.includes("body/username") && msg.includes("fewer than 6"))
    		  msg = "Username must be at least 6 characters long.";
    		if (msg.includes("body/password") && msg.includes("fewer than 6"))
    		  msg = "Password must be at least 6 characters long.";
    		if (msg.includes("format: email")) 
    		  msg = "Please enter a valid email address.";
    		setError(msg);
  		} else {
    		setError("Network error. Please try again.");
		}
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-300 mb-4 text-center">Player Registration</h2>
      <hr className="border-blue-800 mb-6" />
      {error && (
        <div className="mb-6 max-w-full">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
            <p className="text-red-400 text-sm break-words whitespace-pre-wrap leading-relaxed text-center">{error}</p>
          </div>
        </div>
      )}
      {message && (
        <div className="mb-6 max-w-full">
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
            <p className="text-green-400 text-sm break-words whitespace-pre-wrap leading-relaxed text-center">{message}</p>
          </div>
        </div>
      )}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="relative">
          <label className="block text-lg font-semibold text-blue-300 mb-2">USERNAME</label>
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
          <label className="block text-lg font-semibold text-blue-300 mb-2">EMAIL</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full pl-4 px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow"
            placeholder="Enter your email"
          />
        </div>
        <div className="relative">
          <label className="block text-lg font-semibold text-blue-300 mb-2">PASSWORD</label>
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
        <div className="relative">
          <label className="block text-lg font-semibold text-blue-300 mb-2">CONFIRM PASSWORD</label>
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="w-full pl-4 px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow"
            placeholder="Confirm your password"
          />
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-extrabold shadow-lg disabled:opacity-50"
          >
            {loading ? 'JOINING...' : 'JOIN TOURNAMENT'}
          </button>
        </div>
      </form>
    </div>
  );
}