import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Registration from './components/Registration'
import Login from './components/Login'
import VotingDashboard from './components/VotingDashboard'
import Results from './components/Results'
import { checkAuthState, logoutVoter } from '../authentication/firebase'

function App() {
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  // Check for authenticated user on app load
  useEffect(() => {
    const unsubscribe = checkAuthState((user) => {
      if (user) {
        // User is signed in
        if (user.emailVerified) {
          setUser({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          });
        } else {
          // Log out users with unverified emails
          logoutVoter();
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false)
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
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
        <Navbar user={user} setUser={setUser} />
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App