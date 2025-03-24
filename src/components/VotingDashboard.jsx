import { useState } from 'react'

export default function VotingDashboard({ user, votes, setVotes }) {
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const candidates = ['Candidate A', 'Candidate B', 'Candidate C']

  const handleVote = () => {
    if (!selectedCandidate) return alert('Please select a candidate')
    
    const newVote = {
      voterKey: user.key,
      candidate: selectedCandidate,
      timestamp: new Date().toISOString()
    }
    
    setVotes([...votes, newVote])
    alert('Vote submitted successfully!')
    setSelectedCandidate('')
  }

  return (
    <div className="card">
      <h2>Voting Dashboard</h2>
      <div style={{ margin: '20px 0' }}>
        {candidates.map(candidate => (
          <div key={candidate} style={{ margin: '10px 0' }}>
            <label>
              <input 
                type="radio"
                name="candidate"
                value={candidate}
                checked={selectedCandidate === candidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
              />
              {candidate}
            </label>
          </div>
        ))}
      </div>
      <button className="button" onClick={handleVote}>
        Submit Vote
      </button>
    </div>
  )
}