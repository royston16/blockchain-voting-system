import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'

export default function Results({ votes }) {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate blockchain data loading
    const timer = setTimeout(() => {
      const result = {}
      votes.forEach(vote => {
        result[vote.candidate] = (result[vote.candidate] || 0) + 1
      })
      setResults(result)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [votes])

  const getPercentage = (votes) => {
    const total = Object.values(results).reduce((a, b) => a + b, 0)
    return total > 0 ? ((votes / total) * 100).toFixed(1) : 0
  }

  return (
    <div>
      <BlockchainInfo />
      <div className="card">
        <h2>Election Results</h2>
        {loading ? (
          <div className="loading">Loading results from blockchain...</div>
        ) : (
          <>
            <div className="results-grid">
              {Object.entries(results).map(([candidate, votes]) => (
                <div key={candidate} className="result-card">
                  <h3>{candidate}</h3>
                  <div className="vote-count">{votes} votes</div>
                  <div className="percentage-bar">
                    <div 
                      className="percentage-fill"
                      style={{ width: `${getPercentage(votes)}%` }}
                    />
                  </div>
                  <div className="percentage">{getPercentage(votes)}%</div>
                </div>
              ))}
            </div>
            <div className="results-summary">
              <div className="summary-item">
                <span className="summary-label">Total Votes Cast</span>
                <span className="summary-value">{votes.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Block Height</span>
                <span className="summary-value">{votes.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Last Update</span>
                <span className="summary-value">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}