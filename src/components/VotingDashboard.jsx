import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'

export default function VotingDashboard({ user, votes, setVotes }) {
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [votingStatus, setVotingStatus] = useState('ready')
  const [transactionHash, setTransactionHash] = useState('')
  const candidates = [
    { id: 'A', name: 'Candidate A', party: 'Party 1', description: 'Experienced leader with proven track record' },
    { id: 'B', name: 'Candidate B', party: 'Party 2', description: 'Fresh perspective and innovative ideas' },
    { id: 'C', name: 'Candidate C', party: 'Party 3', description: 'Focus on economic development and stability' }
  ]

  const handleVote = async () => {
    if (!selectedCandidate) return alert('Please select a candidate')
    
    setVotingStatus('processing')
    
    // Mock blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const mockHash = `0x${Math.random().toString(16).substr(2, 64)}`
    setTransactionHash(mockHash)
    
    const newVote = {
      voterKey: user.key,
      candidate: selectedCandidate,
      timestamp: new Date().toISOString(),
      transactionHash: mockHash
    }
    
    setVotes([...votes, newVote])
    setVotingStatus('completed')
    setSelectedCandidate('')
  }

  return (
    <div>
      <BlockchainInfo />
      <div className="card">
        <h2>Cast Your Vote</h2>
        <div className="candidates-grid">
          {candidates.map(candidate => (
            <div 
              key={candidate.id} 
              className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}
              onClick={() => setSelectedCandidate(candidate.id)}
            >
              <h3>{candidate.name}</h3>
              <p className="party">{candidate.party}</p>
              <p className="description">{candidate.description}</p>
              <div className="radio-wrapper">
                <input 
                  type="radio"
                  name="candidate"
                  value={candidate.id}
                  checked={selectedCandidate === candidate.id}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                />
                <span className="radio-label">Select</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="voting-actions">
          <button 
            className="button" 
            onClick={handleVote}
            disabled={votingStatus === 'processing' || !selectedCandidate}
          >
            {votingStatus === 'processing' ? 'Processing...' : 'Submit Vote'}
          </button>
        </div>

        {transactionHash && (
          <div className="transaction-info">
            <h3>Transaction Details</h3>
            <p>Transaction Hash: <code>{transactionHash}</code></p>
            <p>Status: <span className="status-success">Confirmed</span></p>
          </div>
        )}
      </div>
    </div>
  )
}