import { useState, useEffect } from 'react';
import { generateSecret, enable2FA } from '../../authentication/twoFactor';
import { db, auth } from '../../authentication/firebase';
import { doc, getDoc } from 'firebase/firestore';

//method to set up the 2FA for the voter to ensure the security of their account
export default function SetUp2FA({ user }) {
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('initial');
  const [isEnabled, setIsEnabled] = useState(false);
  
  //method to check if the 2FA is enabled for the voter
  useEffect(() => {
    async function checkEnabledStatus() {
      if (auth.currentUser?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'voters', auth.currentUser.uid));
          if (userDoc.exists() && userDoc.data().twoFactorEnabled) {
            setIsEnabled(true);
          }
        } catch (error) {
          console.error('Error checking 2FA status:', error);
        }
      }
    }
    
    checkEnabledStatus();
  }, []);
  
  //method to generate the secret key for the 2FA
  const handleGenerateSecret = async () => {
    if (!auth.currentUser?.uid) {
      alert('You must be logged in to set up 2FA');
      return;
    }
    
    try {
      setStatus('generating');
      const { secret, qrCodeUrl } = await generateSecret(auth.currentUser.uid);
      setSecret(secret);
      setQrCode(qrCodeUrl);
      setStatus('ready');
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setStatus('error');
    }
  };

  //method to submit the 2FA code for the 2FA verification process
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || token.length !== 6 || !auth.currentUser?.uid) return;
    
    setStatus('verifying');
    
    try {
      const result = await enable2FA(auth.currentUser.uid, token);
      setStatus(result ? 'enabled' : 'failed');
      if (result) {
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      setStatus('error');
    }
  };
  
  //condition to display that the 2FA is enabled for the voter
  if (isEnabled) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Two-Factor Authentication</h2>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">2FA is enabled for your account</p>
          <p className="mt-2">Two-factor authentication is currently active on your account.</p>
          <p className="mt-2">Your account is now protected with an additional layer of security.</p>
        </div>
      </div>
    );
  }

  //front end display of the 2FA setup
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Setup Two-Factor Authentication</h2>
      <p className="mb-4">Two-factor authentication adds an extra layer of security to your account.</p>
      
      {status === 'initial' && (
        <button 
          onClick={handleGenerateSecret}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Start Setup
        </button>
      )}
      
      {status === 'generating' && <p>Generating your secure key...</p>}
      
      {qrCode && (
        <div className="bg-gray-100 p-4 rounded mt-4">
          <p className="mb-2">1. Scan this QR code with an authenticator app:</p>
          <img src={qrCode} alt="2FA QR Code" className="mx-auto my-4" />
          
          <p className="mb-2">2. Or manually enter this code in your app:</p>
          <code className="bg-gray-200 p-2 rounded block mb-4">{secret}</code>
          
          <form onSubmit={handleSubmit} className="mt-4">
            <p className="mb-2">3. Enter the 6-digit code from your app:</p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full p-2 border rounded"
            />
            
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mt-4"
              disabled={status === 'verifying' || !token || token.length !== 6}
            >
              {status === 'verifying' ? 'Verifying...' : 'Enable 2FA'}
            </button>
          </form>
        </div>
      )}
      
      {status === 'enabled' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
          <p className="font-bold">Success!</p>
          <p>Two-factor authentication has been enabled for your account.</p>
        </div>
      )}
      
      {(status === 'failed' || status === 'error') && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          <p className="font-bold">Error</p>
          <p>Failed to enable 2FA. Please check your code and try again.</p>
        </div>
      )}
    </div>
  );
}
