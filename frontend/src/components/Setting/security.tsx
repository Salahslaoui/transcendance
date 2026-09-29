import React, {useState } from 'react'
import Api from '@/helpers/axios';
import {useUser} from '@/contexts/user-provider';
import {SecurityCheck} from '@/helpers/types';

export default function Security({setError, setSuccess}: SecurityCheck) {
	const {user, setUser} = useUser();
	const [showQR, setShowQR] = useState(false);
	const [qrCode, setQrCode] = useState<string | null>(null);
	const [twoFAToken, setTwoFAToken] = useState("");

	if (!user)
		throw new Error("User doesnt exist");

	const handleEnable2FA = async () => {
		try {
      		const response = await Api.post('/auth/2fa/setup');
    		if (response.data && response.data.qrCode) {
        		setQrCode(response.data.qrCode);
        		setShowQR(true);
        		setSuccess('Scan the QR code with your authenticator app');
        		setTimeout(() => setSuccess(null), 3000);
      		}
    	} catch (err: any) {
      		console.error('Error enabling 2FA:', err);
      		setError(err.response?.data?.message || 'Error enabling 2FA');
      		setTimeout(() => setError(null), 3000);
    	}
	};

	const handleVerify2FA = async () => {
    	if (!twoFAToken) {
      		setError('Please enter the 6-digit code');
      		setTimeout(() => setError(null), 3000);
      		return;
    	}
    	try {
      		const response = await Api.post('/auth/2fa/verify', {token: twoFAToken});
      		if (response.data && response.data.success) {
        		setUser({...user, is_two_fa_enabled: true});
        		setShowQR(false);
        		setQrCode(null);
        		setTwoFAToken("");
        		setSuccess('2FA enabled successfully');
        		setTimeout(() => setSuccess(null), 3000);
      		}
    	} catch (err: any) {
      		console.error('Error verifying 2FA:', err);
      		setError(err.response?.data?.message || 'Invalid code');
      		setTimeout(() => setError(null), 3000);
    	}
  	};

	const handleDisable2FA = async () => {
    	try {
      		const response = await Api.post('/auth/2fa/disable');
      		if (response.data && response.data.success) {
        		setUser({...user, is_two_fa_enabled: false});
        		setSuccess('2FA disabled successfully');
        		setTimeout(() => setSuccess(null), 3000);
      		}
    	} catch (err: any) {
      		console.error('Error disabling 2FA:', err);
      		setError(err.response?.data?.message || 'Error disabling 2FA');
      		setTimeout(() => setError(null), 3000);
    	}
  	};

	return (
		<div className="space-y-6 px-8 py-6 rounded-2xl  shadow-inner flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-900 border border-gray-800/30">
            <h2 className="text-2xl font-bold text-blue-300 mb-4 text-left">Security</h2>
            <hr className="border-blue-800 mb-6" />
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                </div>
                {user.is_two_fa_enabled ? (
                    <button
                    	type="button"
                    	onClick={handleDisable2FA}
                    	className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold shadow"
                    >
                    	Disable 2FA
                    </button>
                    ) : (
                    	<button
                        	type="button"
                        	onClick={handleEnable2FA}
                        	className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold shadow"
                      	>
                        Enable 2FA
                      </button>
                    )}
            </div>
                {showQR && qrCode && (
                	<div className="mt-6 p-6  border border-blue-500 rounded-xl">
                    	<h4 className="text-lg font-semibold text-blue-300 mb-4 text-center">Scan QR Code</h4>
                    	<div className="flex flex-col items-center">
                    		<img src={qrCode} alt="2FA QR Code" className="w-48 h-48 mb-4" />
                    		<p className="text-sm text-gray-300 mb-4 text-center">
                        		Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        	</p>
                    	<div className="w-full max-w-sm">
                        	<label htmlFor="2fa-token" className="block text-sm font-semibold text-blue-300 mb-2">
                        		Enter 6-digit code
                        	</label>
                        <input
                        	type="text"
                        	id="2fa-token"
                        	placeholder="000000"
                        	maxLength={6}
                        	className="w-full px-4 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-700 text-white text-center text-xl tracking-widest"
                        	value={twoFAToken}
                        	onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                    <div className="flex gap-4 mt-4 w-full max-w-sm">
                        <button
                        	type="button"
                        	onClick={() => {
                            	setShowQR(false);
                            	setQrCode(null);
                            	setTwoFAToken("");
                            }}
                        	className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                        >
                        	Cancel
                        </button>
                        <button
                        	type="button"
                        	onClick={handleVerify2FA}
                        	className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                        >
                        	Verify
                        </button>
                    </div>
                </div>
            </div>
        		)}
        </div>
	)
}
