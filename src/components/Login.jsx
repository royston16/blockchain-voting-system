import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-image.png";
import { loginVoter, auth, sendEmailVerification } from "../../authentication/firebase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../authentication/firebase";
import { verifyToken } from "../../authentication/twoFactor";

// eslint-disable-next-line react/prop-types
export default function Login({ setUser }) {
  const [formData, setFormData] = useState({ 
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationReminder, setVerificationReminder] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [token2FA, setToken2FA] = useState('');
  const [tempUserData, setTempUserData] = useState(null); // Store user data while waiting for 2FA
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerificationReminder(false);
    
    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        throw new Error('Please enter both email and password');
      }
      
      // Login with email and password
      const result = await loginVoter(formData.email, formData.password);
      
      if (result && result.user) {
        // Get the user from Firestore after email/password auth
        const userDoc = await getDoc(doc(db, 'voters', result.user.uid));
        
        if (!userDoc.exists()) {
          throw new Error('User record not found. Please contact support.');
        }
        
        const userData = userDoc.data();
        console.log("Retrieved user data:", userData);
        
        // Prepare the complete user data
        const completeUserData = {
          uid: result.user.uid,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          ...userData
        };
        
        // Check if 2FA is enabled
        if (userData.twoFactorEnabled) {
          console.log("2FA is enabled for user, waiting for verification code");
          setRequire2FA(true);
          setTempUserData(completeUserData); // Store data for after 2FA verification
          setUser(completeUserData, true); // Signal that 2FA is pending
          setLoading(false);
          return; // Stop here and wait for 2FA
        }
        
        // No 2FA required, proceed with login
        console.log("2FA not enabled, proceeding with login");
        setUser(completeUserData);
        
        // Redirect to voting dashboard
        navigate("/vote");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      // Check if the error is about email verification
      if (err.message.includes('verify your email')) {
        setVerificationReminder(true);
      }
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        alert("Verification email sent! Please check your inbox.");
      } else {
        alert("Please try logging in first, then request a new verification email.");
      }
    } catch (error) {
      alert("Error sending verification email: " + error.message);
    }
  };

  const handle2FAVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Use the stored tempUserData that we saved during initial login
      if (!tempUserData) {
        throw new Error('User session expired. Please login again.');
      }
      
      const verified = await verifyToken(auth.currentUser.uid, token2FA);
      
      if (verified) {
        console.log("2FA verification successful, completing authentication");
        
        // Use the temporarily stored user data after successful 2FA
        setUser(tempUserData, false); // Signal that 2FA is complete
        
        // Navigate only after successful 2FA
        navigate('/vote');
      } else {
        setError('Invalid 2FA code. Please try again.');
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      setError('Error verifying 2FA: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex justify-between">
      <form onSubmit={handleLogin} className="w-full pr-4">
        <h2 className="font-bold text-xl">Voter Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {verificationReminder && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mt-4" role="alert">
            <h3 className="font-bold">Email Verification Required</h3>
            <p className="mt-2">For security reasons, you must verify your email before accessing the voting system.</p>
            <ol className="list-decimal pl-4 mt-2">
              <li>Check your inbox for the verification email</li>
              <li>Click the verification link in the email</li>
              <li>Return to this page and log in again</li>
            </ol>
            <button 
              type="button"
              onClick={resendVerificationEmail}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mt-2"
            >
              Resend Verification Email
            </button>
          </div>
        )}
        
        {require2FA && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mt-4">
            <h3 className="font-bold">Two-Factor Authentication Required</h3>
            <p className="mt-2">Please enter the 6-digit code from your authenticator app!</p>
            <div className="mt-2">
              <input
                type="text"
                value={token2FA}
                onChange={(e) => setToken2FA(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            <button 
              onClick={handle2FAVerification}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2"
              disabled={loading || token2FA.length !== 6}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}
        
        {!require2FA && (
          <>
            <div className="mt-4">
              <label className="font-semibold">Email: </label>
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            
            <div className="mt-4">
              <label className="font-semibold">Password: </label>
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 border rounded mt-1"
              />
            </div>
            
            <button 
              className="button mt-6 w-full" 
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </>
        )}
        
        <p className="mt-4 text-center">
          Don't have an account?{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => navigate("/")}
          >
            Register here
          </button>
        </p>
      </form>
      <img src={bg} alt="background" className="w-1/2" />
    </div>
  );
}
