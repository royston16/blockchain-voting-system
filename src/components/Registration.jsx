import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import blockchainVote from "../assets/blockchainVote.png";
import { registerVoter, logoutVoter, checkEmailAvailability } from "../../authentication/firebase";
import ReCAPTCHA from "react-google-recaptcha";

//method to register the voter with the required parameters
export default function Registration() {
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isOver18, setIsOver18] = useState(false);
  const [consentToTerms, setConsentToTerms] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const [emailStatus, setEmailStatus] = useState({ checking: false, available: true, message: "" });
  const navigate = useNavigate();

  //debounced email check to prevent spamming the server
  const debouncedEmailCheck = useCallback(
    async (email) => {
      if (!email || !email.includes('@')) {
        setEmailStatus({ checking: false, available: true, message: "" });
        return;
      }

      setEmailStatus(prev => ({ ...prev, checking: true }));
      const isAvailable = await checkEmailAvailability(email);
      
      if (isAvailable === null) {
        setEmailStatus({ 
          checking: false, 
          available: true, 
          message: "" 
        });
      } else {
        setEmailStatus({
          checking: false,
          available: isAvailable,
          message: isAvailable ? 
            "✓ Email is available" : 
            "✗ This email is already registered"
        });
      }
    },
    []
  );

  //handle email change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        debouncedEmailCheck(formData.email);
      }
    }, 500); //500ms delay to prevent spamming the server

    return () => clearTimeout(timeoutId);
  }, [formData.email, debouncedEmailCheck]);

  //method to handle the submission of the registration form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      //validate the email
      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      //additional validation
      if (formData.name.trim().length < 2) {
        throw new Error('Please enter your full name');
      }
      
      //validate the password
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      //confirm the password
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      //validate the reCAPTCHA
      if (!recaptchaValue) {
        throw new Error('Please complete the reCAPTCHA verification');
      }

      //validate the age verification to ensure the user is over 18
      if (!isOver18) {
        throw new Error('You must confirm that you are 18 years or older');
      }

      //validate the consent to ensure the user understands the terms and conditions
      if (!consentToTerms) {
        throw new Error('You must agree to the terms and conditions');
      }
      
      //register the voter with the email and password
      await registerVoter(formData.email, formData.password, {
        name: formData.name,
        registrationTime: new Date().toISOString(),
        isOver18: isOver18,
        hasConsented: consentToTerms
      });
      
      //show the success message
      setSuccess(true);
      
      //clear the form
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setRecaptchaValue(null);
      setIsOver18(false);
      setConsentToTerms(false);
      
      //explicitly log out the user first (Firebase automatically signs in new users)
      await logoutVoter();
      
      //automatically redirect to the login page after logging out
      setTimeout(() => {
        navigate("/login");
      }, 1500);                //1500ms delay
      
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  console.log(recaptchaValue);

  //front end display of the registration form
  return (
    <div className="min-h-screen flex flex-col items-center w-full">
      <img src={blockchainVote} alt="BlockchainVote Logo" className="h-24 w-auto mb-6 mt-6" />
      <div className="w-full max-w-[520px] bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <p className="text-2xl text-center font-bold text-gray-900">Sign Up</p>
          <p className="text-center text-sm text-gray-600 mt-2">
            Join our secure blockchain-based voting system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 rounded-md p-4 text-sm">
              <p className="font-medium">Registration successful!</p>
              <p className="mt-1">A verification email has been sent to your email address.</p>
              <p className="mt-1">Important: You must verify your email before you can log in and vote.</p>
              <p className="mt-1">Redirecting to login page...</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                emailStatus.message ? 
                  emailStatus.available ? 'border-green-500' : 'border-red-500' 
                  : 'border-gray-300'
              }`}
            />
            {emailStatus.checking ? (
              <p className="mt-1 text-sm text-gray-500">Checking email availability...</p>
            ) : emailStatus.message ? (
              <p className={`mt-1 text-sm ${
                emailStatus.available ? 'text-green-600' : 'text-red-600'
              }`}>
                {emailStatus.message}
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">We&apos;ll send a verification email to this address</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Create a password (min. 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="ageVerification"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                required
              />
              <label htmlFor="ageVerification" className="ml-2 block text-sm text-gray-700">
                I confirm that I am 18 years or older and eligible to vote
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="consentCheckbox"
                checked={consentToTerms}
                onChange={(e) => setConsentToTerms(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                required
              />
              <label htmlFor="consentCheckbox" className="ml-2 block text-sm text-gray-700">
                I consent to the terms and conditions, including the processing of my data for the purpose of this voting system. I understand that my vote will be recorded on the blockchain.
              </label>
            </div>
          </div>

          <div className="flex justify-center">
            <ReCAPTCHA
              sitekey="6LcXnSMrAAAAALl_femTwBqY_ZHQbk3xI4I6hKPY"
              onChange={(value) => setRecaptchaValue(value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
