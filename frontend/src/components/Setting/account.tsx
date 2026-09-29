import React, {useState } from 'react'
import Api from '@/helpers/axios';
import axios from 'axios';
import {useUser} from '@/contexts/user-provider';
import {SecurityCheck} from '@/helpers/types';

export default function Account ({setError, setSuccess}: SecurityCheck) {
	const {user, setUser} = useUser();
	const [username, setUsername] = useState(user?.username || "");

    if (!user)
        return <h1>Loading</h1>

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    	setUsername(e.target.value);
  	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    	e.preventDefault();
    	setError(null);
    	const { 
      	username, 
      	['current-password']: currentPassword, 
      	['new-password']: newPassword, 
      	['confirm-password']: confirmPassword 
    	} = e.currentTarget;
    	const newUsername = username.value.trim();
    	const newPasswordd = newPassword.value;
    	const currentPwd = currentPassword.value;
    	const confirmPwd = confirmPassword.value;

    	if (newPasswordd && newPasswordd.length < 6)
			return setError('Password must be at least 6 characters');
    	if (newPasswordd && newPasswordd !== confirmPwd)
			return setError('Passwords do not match');
    	try {
      		if (newUsername && newUsername !== user?.username) {
				if (newUsername.length < 6)
					return setError('Username must be at least 6 characters long');
				if (newUsername.length > 20)
					return setError('Username must not exceed 20 characters');
				const res = await Api.post('/user/modify/username', { newusername: newUsername });
        		if (res.data && res.data.details) {
          			const updatedUser = { ...user, username: res.data.details.newusername };
          			setUser(updatedUser);
        		}
        		setSuccess('Username updated successfully');
        		setTimeout(() => setSuccess(null), 2000);
      		}
      		if (newPasswordd) {        
        		try {
					const response = await Api.post('/user/modify/password', {
						oldPassword: currentPwd,
						newPassword: newPasswordd
						});
		  			if (response.data && response.data.success) {
          				setSuccess('Password updated successfully');
          				setTimeout(() => setSuccess(null), 2000);
		  			}
        		} catch (passwordError: any) {
          			console.error('Password update specific error:', passwordError);
          			console.error('Password error response:', passwordError.response?.data);
          			throw passwordError;
        		}
      		}
      		setError(null);
    	} catch (err: any) {
      		console.error('Settings update error:', err);
      		if (axios.isAxiosError(err) && err.response) {
        		let errorMessage = err.response.data?.error || err.response.data?.message || err.response.data?.details?.error || 'Error updating settings';
        		if (errorMessage.includes("/newusername") && errorMessage.includes("fewer than 6"))
        		  errorMessage = "Username must be at least 6 characters long.";
        		if (errorMessage.includes("/newusername") && errorMessage.includes("more than 20"))
        		  errorMessage = "Username must not exceed 20 characters.";
        		if (errorMessage.includes("/newPassword") && errorMessage.includes("fewer than 6"))
        		  errorMessage = "Password must be at least 6 characters long.";
        		if (errorMessage.includes("/oldPassword") && errorMessage.includes("fewer than 6"))
        		  errorMessage = "Current password must be at least 6 characters long.";
        		if (errorMessage.includes("format: email")) 
        		  errorMessage = "Please enter a valid email address.";
        		setError(errorMessage);
        		setTimeout(() => setError(null), 3000);
     		} else {
        		setError('Network error - please try again');
        		setTimeout(() => setError(null), 3000);
      		}
    	}
  	};

	return (
		<form action="" className="space-y-6 px-8 py-6 rounded-2xl border border-gray-800/30 shadow-inner flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-900" onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold text-blue-300 mb-4 text-left">Account Info</h2>
            <hr className="border-blue-800 mb-6" />
            <div className="relative">
                <label htmlFor="username" className="block text-lg font-semibold text-blue-300 mb-2">Username</label>
                <input
                    type="text"
                    id="username"
                    placeholder="Enter username"
                    className="w-full px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow"
                    value={username}
                    onChange={handleInputChange}
                />
            </div>
            <div className="relative">
                <label 
					htmlFor="current-password"
					className="block text-lg font-semibold text-blue-300 mb-2"
				>
					Current Password
				</label>
                <input
					type="password"
					id="current-password"
					placeholder="Enter current password"
					className="w-full px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow" />
            </div>
            <div className="relative">
                <label
					htmlFor="new-password"
					className="block text-lg font-semibold text-blue-300 mb-2"
				>
					New Password
				</label>
                <input
					type="password"
					id="new-password"
					placeholder="Enter new password"
					className="w-full px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow" />
            </div>
            <div className="relative">
                <label
					htmlFor="confirm-password"
					className="block text-lg font-semibold text-blue-300 mb-2"
				>
					Confirm Password
				</label>
                <input 
					type="password"
					id="confirm-password"
					placeholder="Confirm password"
					className="w-full px-5 py-3 border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-800 text-white placeholder:text-blue-200 shadow" />
            </div>
            <div className="flex gap-4 pt-4">
                <button type="button" className="flex-1 bg-gray-700 text-white px-8 py-3 rounded-xl hover:bg-gray-600 transition-colors font-bold shadow text-lg">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-500 text-white px-8 py-3 rounded-xl hover:bg-blue-600 transition-colors font-extrabold shadow-lg text-lg">Save Changes</button>
            </div>
        </form>
	)
}