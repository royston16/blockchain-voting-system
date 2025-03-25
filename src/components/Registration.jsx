import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-image.png";
import { registerVoter, logoutVoter, checkEmailAvailability } from "../../authentication/firebase";

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
  const [captcha, setCaptcha] = useState({ question: "", answer: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [emailStatus, setEmailStatus] = useState({ checking: false, available: true, message: "" });
  const navigate = useNavigate();

  // Debounced email check
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

  // Handle email change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        debouncedEmailCheck(formData.email);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.email, debouncedEmailCheck]);

  // Generate simple math captcha on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Generate a pattern recognition CAPTCHA that's difficult for bots
  const generateCaptcha = () => {
    // Create a random array of symbols
    const symbols = ['@', '#', '$', '%', '&', '*', '+', '=', '>', '<'];
    const targetSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    // Create a pattern with random distribution of symbols
    let pattern = '';
    let count = 0;
    
    const patternLength = Math.floor(Math.random() * 10) + 20; // 20-30 characters
    
    for (let i = 0; i < patternLength; i++) {
      // Decide whether to add the target symbol or a random one
      if (Math.random() < 0.3) { // 30% chance for target symbol
        pattern += targetSymbol;
        count++;
      } else {
        // Add a random symbol that's not the target
        const otherSymbols = symbols.filter(s => s !== targetSymbol);
        pattern += otherSymbols[Math.floor(Math.random() * otherSymbols.length)];
      }
    }
    
    setCaptcha({
      question: `How many "${targetSymbol}" symbols appear in this pattern?\n\n "${pattern}"`,
      answer: count
    });
    setCaptchaAnswer("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validate email
      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      // Additional validation
      if (formData.name.trim().length < 2) {
        throw new Error('Please enter your full name');
      }
      
      // Validate password
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Confirm password
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      // Validate captcha
      if (parseInt(captchaAnswer) !== captcha.answer) {
        throw new Error('Incorrect CAPTCHA answer');
      }

      // Validate age verification
      if (!isOver18) {
        throw new Error('You must confirm that you are 18 years or older');
      }

      // Validate consent
      if (!consentToTerms) {
        throw new Error('You must agree to the terms and conditions');
      }
      
      // Register voter with email and password
      await registerVoter(formData.email, formData.password, {
        name: formData.name,
        registrationTime: new Date().toISOString(),
        isOver18: isOver18,
        hasConsented: consentToTerms
      });
      
      // Show success message
      setSuccess(true);
      
      // Clear form
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setCaptchaAnswer("");
      setIsOver18(false);
      setConsentToTerms(false);
      generateCaptcha();
      
      // Explicitly log out the user first (Firebase automatically signs in new users)
      await logoutVoter();
      
      // Automatically redirect to login page after logging out
      setTimeout(() => {
        navigate("/login");
      }, 1500);                // 1500ms delay
      
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex justify-between">
      <form onSubmit={handleSubmit} className="w-full pr-4">
        <h2 className="font-bold text-xl">Voter Registration</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4" role="alert">
            <span className="font-bold block mb-1">Registration successful!</span>
            <p>A verification email has been sent to your email address.</p>
            <p className="mt-2">Important: You must verify your email before you can log in and vote.</p>
            <p className="mt-2">Redirecting to login page...</p>
          </div>
        )}
        
        <div className="mt-4">
          <label className="font-semibold">Full Name: </label>
          <input
            type="text"
            required
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded mt-1"
          />
        </div>
        
        <div className="mt-4">
          <label className="font-semibold">Email: </label>
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full p-2 border rounded mt-1 ${
              emailStatus.message ? 
                emailStatus.available ? 'border-green-500' : 'border-red-500' 
                : ''
            }`}
          />
          {emailStatus.checking ? (
            <p className="text-sm text-gray-600 mt-1">Checking email availability...</p>
          ) : emailStatus.message ? (
            <p className={`text-sm mt-1 ${
              emailStatus.available ? 'text-green-600' : 'text-red-600'
            }`}>
              {emailStatus.message}
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">We'll send a verification email to this address</p>
          )}
        </div>
        
        <div className="mt-4">
          <label className="font-semibold">Password: </label>
          <input
            type="password"
            required
            placeholder="Create a password (min. 6 characters)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-2 border rounded mt-1"
          />
        </div>
        
        <div className="mt-4">
          <label className="font-semibold">Confirm Password: </label>
          <input
            type="password"
            required
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full p-2 border rounded mt-1"
          />
        </div>

        {/* CAPTCHA */}
        <div className="mt-4">
          <label className="font-semibold">CAPTCHA: {captcha.question}</label>
          <input
            type="number"
            required
            placeholder="Enter your answer"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            className="w-full p-2 border rounded mt-1"
          />
          <button 
            type="button" 
            onClick={generateCaptcha}
            className="text-blue-600 text-sm mt-1"
          >
            New captcha
          </button>
        </div>

        {/* Age Verification */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="ageVerification"
            checked={isOver18}
            onChange={(e) => setIsOver18(e.target.checked)}
            className="mr-2"
            required
          />
          <label htmlFor="ageVerification" className="text-sm">
            I confirm that I am 18 years or older and eligible to vote
          </label>
        </div>

        {/* Consent Checkbox */}
        <div className="mt-2 flex items-center">
          <input
            type="checkbox"
            id="consentCheckbox"
            checked={consentToTerms}
            onChange={(e) => setConsentToTerms(e.target.checked)}
            className="mr-2"
            required
          />
          <label htmlFor="consentCheckbox" className="text-sm">
            I consent to the terms and conditions, including the processing of my data for the purpose of this voting system. I understand that my vote will be recorded on the blockchain.
          </label>
        </div>
        
        <button 
          className="button mt-6" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <img src={bg} alt="background" className="w-1/2" />
    </div>
  );
}
