import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutVoter } from '../../authentication/firebase';

//eslint-disable-next-line react/prop-types (no need for prop types in this component)
export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Check if user has admin privileges
  const isAdmin = user && user.email && (
    user.email.endsWith('@admin.com') || 
    user.email === 'admin@example.com' || 
    user.email.includes('admin') ||
    user.isAdmin === true ||
    true // Temporarily make admin menu visible for all logged-in users
  );

  //get a simple and reliable display name
  const getDisplayName = () => {
    if (!user) return '';
    
    //use voter key if available - an unique identifier for each voter in the blockchain
    if (user.voterKey) return `${user.voterKey}`;
    
    //fall back to something like the email address to identify the voter
    if (user.email) {
      const username = user.email.split('@')[0];
      return `Voter #${username.substring(0, 4)}`;
    }
    
    //last resort to identify the voter
    return 'Voter';
  };

  //method to logout the voter
  const handleLogout = async () => {
    try {
      await logoutVoter();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Toggle admin dropdown menu
  const toggleAdminMenu = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  //front end display of the navbar
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
            
            {isAdmin && (
              <div className="relative">
                <button 
                  onClick={toggleAdminMenu}
                  className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                >
                  Admin
                  <svg 
                    className={`ml-1 h-4 w-4 transition-transform ${adminMenuOpen ? 'transform rotate-180' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link 
                      to="/admin" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
                      onClick={() => setAdminMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/admin/configuration" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
                      onClick={() => setAdminMenuOpen(false)}
                    >
                      Configuration
                    </Link>
                  </div>
                )}
              </div>
            )}
            
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
