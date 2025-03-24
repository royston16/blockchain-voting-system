import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Registration from './components/Registration'
import Login from './components/Login'
import VotingDashboard from './components/VotingDashboard'
import Results from './components/Results'

function App() {
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState([])

  return (
    <Router>
      <div className="container">
        <Navbar user={user} setUser={setUser} />
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route 
            path="/vote" 
            element={<VotingDashboard user={user} votes={votes} setVotes={setVotes} />} 
          />
          <Route path="/results" element={<Results votes={votes} />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App