import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-image.png";
import { loginVoter, auth, sendEmailVerification } from "../../authentication/firebase";

// eslint-disable-next-line react/prop-types
export default function Login({ setUser }) {
  const [formData, setFormData] = useState({ 
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationReminder, setVerificationReminder] = useState(false);
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
        // Set user state
        setUser({
          uid: result.user.uid,
          email: result.user.email,
          ...result.voterData
        });
        
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
