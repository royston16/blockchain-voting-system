import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Registration from './components/Registration'
import Login from './components/Login'
import VotingDashboard from './components/VotingDashboard'
import Results from './components/Results'
import BlockchainVerify from './components/BlockchainVerify'
import { checkAuthState, logoutVoter } from '../authentication/firebase'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../authentication/firebase'
import SetUp2FA from './components/SetUp2FA'
import blockchainService from './blockchain/fabric-gateway'
import TestingDashboard from './components/TestingDashboard'
import VoteReceiptViewer from './components/VoteReceiptViewer'

// initialize the block chain on load
// check to see if previous blocks/votes exist
if (true) 
{
  window.allBlocks = [];
}
else
{
  // load from the file all current votes
}
window.firstBlockPreviousHash = "9ab0a3600a1eba7002afccb2931ba5e7";
window.firstBlockHash = "9ab0a3600a1eba7002afccb2931ba5e7";
                      
function App() {
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending2FA, setPending2FA] = useState(false)

  // Custom setUser function that handles 2FA state
  const handleSetUser = (userData, requires2FA = false) => {
    if (requires2FA) {
      // Set pending2FA state to true but don't set the user yet
      console.log("2FA pending, authentication not complete yet");
      setPending2FA(true);
      // We don't set user data here to prevent the app from considering the user as logged in
    } else {
      // User is fully authenticated (including 2FA if required)
      console.log("User fully authenticated, setting user data:", userData);
      setPending2FA(false);
      setUser(userData);
    }
  };

  // Fetch user data from Firestore
  const fetchUserData = async (firebaseUser) => {
    try {
      // Get the user from Firestore
      const userDoc = await getDoc(doc(db, 'voters', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if user has 2FA enabled
        if (userData.twoFactorEnabled) {
          // Don't fully authenticate yet - wait for 2FA verification
          console.log("User has 2FA enabled, authentication pending 2FA verification");
          return;
        }
        
        // Set the complete user data including the voterKey
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          ...userData // This includes the voterKey and any other Firestore data
        });
        
        console.log("User data loaded with voterKey:", userData.voterKey);
      } else {
        // If no Firestore document exists, fall back to basic Firebase data
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified
        });
        console.warn("No Firestore document found for user");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fall back to basic user data
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      });
    }
  };

  // Check for authenticated user on app load
  useEffect(() => {
    const unsubscribe = checkAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        if (firebaseUser.emailVerified) {
          // Fetch the complete user data including voterKey
          await fetchUserData(firebaseUser);
        } else {
          // Log out users with unverified emails
          logoutVoter();
          setUser(null);
          setPending2FA(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setPending2FA(false);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Initialize blockchain service
  useEffect(() => {
    async function initBlockchain() {
      await blockchainService.initialize();
    }
    
    initBlockchain();
  }, []);

  // Protected route wrapper component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <div className="loading">Loading...</div>
    }
    
    if (!user) {
      return <Navigate to="/login" replace />
    }
    
    return children
  }

  if (loading) {
    return <div className="loading">Loading auth state...</div>
  }

  return (
    <Router>
      <div className="container mx-auto px-4">
        {/* Show navbar for all users except during pending 2FA */}
        {!pending2FA && <Navbar user={user} setUser={setUser} />}
        
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/login" element={<Login setUser={handleSetUser} />} />
          <Route 
            path="/vote" 
            element={
              <ProtectedRoute>
                <VotingDashboard user={user} votes={votes} setVotes={setVotes} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/results" 
            element={
              <ProtectedRoute>
                <Results votes={votes} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chain" 
            element={
              <ProtectedRoute>
                <BlockchainVerify votes={votes} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/2fa" 
            element={
              <ProtectedRoute>
                <SetUp2FA user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/testing" 
            element={
              <ProtectedRoute>
                <TestingDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/receipts" 
            element={
              <ProtectedRoute>
                <VoteReceiptViewer user={user} />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App