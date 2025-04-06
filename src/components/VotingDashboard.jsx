import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import Block from '../chain/Blockchain'

export default function VotingDashboard({ user, votes, setVotes }) {
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [votingStatus, setVotingStatus] = useState('ready')
  const [transactionHash, setTransactionHash] = useState('')
  const candidates = [
    { id: 'A', name: 'Candidate A', party: 'Party 1', description: 'Experienced leader with proven track record' },
    { id: 'B', name: 'Candidate B', party: 'Party 2', description: 'Fresh perspective and innovative ideas' },
    { id: 'C', name: 'Candidate C', party: 'Party 3', description: 'Focus on economic development and stability' }
  ]
  const [isVisible, setVisibility] = useState(false)

  const handleVote = async () => {
    if (!selectedCandidate) return alert('Please select a candidate')
    
    setVotingStatus('processing')
    
    // Mock blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000))

    const mockHash = `0x${Math.random().toString(16).substr(2, 64)}`
    
    const newVote = {
      voterKey: user.key,
      voterName: user.name,
      voterEmail: user.email,
      candidate: selectedCandidate,
      timestamp: new Date().toISOString(),
    }

    // check if vote is valid if email has already been used
    let foundEmail = false;
    let count = 0;
    for(let i = 0; i < window.allBlocks.length; i++)
      {
        if(newVote.voterEmail == window.allBlocks[i].getVoterEmail())
        {
          count = count + 1
          if(count >= 3)
          {
            foundEmail = true;
            break;
          }
        }
      }
    if(foundEmail)
    {
      // show div that says email is not valid
      setVisibility(true)
      setVotingStatus('completed')
      setSelectedCandidate('')
    }
    else
    { 
      setVisibility(false)
      // process vote
      setVotes([...votes, newVote])
      setVotingStatus('completed')
      setSelectedCandidate('')
      
      if(window.allBlocks.length === 0)
      {
        // first block
        let newBlock = new Block(newVote.voterEmail, newVote.timestamp,
                            newVote.candidate, window.firstBlockPreviousHash);
        window.allBlocks.push(newBlock);
        setTransactionHash(window.allBlocks[window.allBlocks.length - 1].getCurrentBlockHash())
      }
      else
      {
        let oldBlock = window.allBlocks[window.allBlocks.length - 1]
        let newBlock = new Block(newVote.voterEmail, newVote.timestamp,
                            newVote.candidate, oldBlock.getCurrentBlockHash());
        window.allBlocks.push(newBlock)
        setTransactionHash(window.allBlocks[window.allBlocks.length - 1].getCurrentBlockHash())
      }
      
      console.log(window.allBlocks)
    }

    
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
        {isVisible && (
            <div class="voting-popup">Email Invalid. Already Voted Aloted Number of Times!</div>
          )}

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