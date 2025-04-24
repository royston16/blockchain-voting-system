import { useState } from "react";
import { useNavigate } from "react-router-dom";
import blockchainVote from "../assets/blockchainVote.png";
import { loginVoter, auth, sendEmailVerification } from "../../authentication/firebase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../authentication/firebase";
import { verifyToken } from "../../authentication/twoFactor";
import PropTypes from 'prop-types';

//eslint-disable-next-line react/prop-types (no need for prop types in this component)
export default function Login({ setUser }) {
  const [formData, setFormData] = useState({ 
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationReminder, setVerificationReminder] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [token2FA, setToken2FA] = useState('');           //store the 2FA token for the user
  const [tempUserData, setTempUserData] = useState(null); //store user data while waiting for 2FA
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerificationReminder(false);
    
    try {
      //validate the inputs
      if (!formData.email || !formData.password) {
        throw new Error('Please enter both email and password');
      }
      
      //login with email and password
      const result = await loginVoter(formData.email, formData.password);
      
      if (result && result.user) {
        //get the user from Firestore after email/password auth
        const userDoc = await getDoc(doc(db, 'voters', result.user.uid));
        
        if (!userDoc.exists()) {
          throw new Error('User record not found. Please contact support.');
        }
        
        const userData = userDoc.data();
        console.log("Retrieved user data:", userData);
        
        //prepare the complete user data for the login process
        const completeUserData = {
          uid: result.user.uid,
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          ...userData
        };
        
        //check if 2FA is enabled
        if (userData.twoFactorEnabled) {
          console.log("2FA is enabled for user, waiting for verification code");
          setRequire2FA(true);
          setTempUserData(completeUserData); //store data for after 2FA verification
          setUser(completeUserData, true); //signal that 2FA is pending
          setLoading(false);
          return; //stop here and wait for 2FA
        }
        
        //if no 2FA required, proceed with login
        console.log("2FA not enabled, proceeding with login");
        setUser(completeUserData);
        
        //redirect to the voting dashboard
        navigate("/vote");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      //check if the error is about email verification
      if (err.message.includes('verify your email')) {
        setVerificationReminder(true);
      }
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  //method to resend the verification email for the verification process of new users
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

  //method to verify the 2FA code for the 2FA verification process
  const handle2FAVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      
      //use the stored tempUserData that we saved during initial login
      if (!tempUserData) {
        throw new Error('User session expired. Please login again.');
      }
      
      const verified = await verifyToken(auth.currentUser.uid, token2FA);
      
      if (verified) {
        console.log("2FA verification successful, completing authentication");
        
        //use the temporarily stored user data after successful 2FA
        setUser(tempUserData, false); //signal that 2FA is complete
        
        //navigate only after successful 2FA
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

  //front end display of the login page
  return (
    <div className="min-h-screen flex flex-col items-center w-full">
      <img src={blockchainVote} alt="BlockchainVote Logo" className="h-24 w-auto mb-6 mt-6" />
      <div className="w-full max-w-[520px] bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <p className="text-2xl text-center font-bold text-gray-900">Welcome Back</p>
          <p className="text-center text-sm text-gray-600 mt-2">
            Sign in to access your voting dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 text-sm">
              {error}
            </div>
          )}

          {verificationReminder && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 text-sm">
              <h3 className="font-medium mb-2">Email Verification Required</h3>
              <p>For security reasons, you must verify your email before accessing the voting system.</p>
              <ol className="list-decimal pl-4 mt-2 mb-3">
                <li>Check your inbox for the verification email</li>
                <li>Click the verification link in the email</li>
                <li>Return to this page and log in again</li>
              </ol>
              <button 
                type="button"
                onClick={resendVerificationEmail}
                className="w-full py-2 px-3 border border-transparent rounded-md text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Resend Verification Email
              </button>
            </div>
          )}

          {require2FA && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-md p-4 text-sm">
              <h3 className="font-medium mb-2">Two-Factor Authentication Required</h3>
              <p>Please enter the 6-digit code from your authenticator app!</p>
              <input
                type="text"
                value={token2FA}
                onChange={(e) => setToken2FA(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <button 
                onClick={handle2FAVerification}
                className="mt-3 w-full py-2 px-3 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || token2FA.length !== 6}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {!require2FA && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Register here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

Login.propTypes = {
  setUser: PropTypes.func.isRequired
};
