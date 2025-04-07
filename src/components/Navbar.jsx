import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutVoter } from '../../authentication/firebase';

// eslint-disable-next-line react/prop-types
export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  // Get a simple and reliable display name
  const getDisplayName = () => {
    if (!user) return '';
    
    // Use voter key if available - this is the most reliable identifier
    if (user.voterKey) return `${user.voterKey}`;
    
    // Fall back to something from the email
    if (user.email) {
      const username = user.email.split('@')[0];
      return `Voter #${username.substring(0, 4)}`;
    }
    
    // Last resort
    return 'Voter';
  };

  const handleLogout = async () => {
    try {
      await logoutVoter();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center mb-6">
      <div className="text-xl font-bold text-indigo-600">
        <Link to="/">BlockchainVote</Link>
      </div>
      
      <div className="flex items-center space-x-6">
        {user ? (
          <>
            <span className="text-gray-700 font-medium">
              Welcome, {getDisplayName()}
            </span>
            
            <Link 
              to="/vote" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Vote
            </Link>
            
            <Link 
              to="/results" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Results
            </Link>

            <Link 
              to="/chain" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Blockchain Verification
            </Link>
            
            <Link 
              to="/receipts" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Vote Receipts
            </Link>
            
            <Link 
              to="/profile/2fa" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Setup 2FA
            </Link>
            
            <Link 
              to="/admin/testing" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Testing
            </Link>
            
            <button 
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className="text-indigo-600 hover:text-indigo-800"
            >
              Login
            </Link>
            
            <Link 
              to="/" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
