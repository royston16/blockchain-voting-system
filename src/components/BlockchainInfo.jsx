import { useState, useEffect } from 'react'

export default function BlockchainInfo() {
  const [blockInfo, setBlockInfo] = useState({
    currentBlock: 1,
    totalVotes: 0,
    lastUpdate: new Date().toISOString(),
    networkStatus: 'Connected'
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockInfo(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString(),
        totalVotes: Math.floor(Math.random() * 1000)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="card">
      <h3>Blockchain Network Status</h3>
      <div className="blockchain-stats">
        <div className="stat-item">
          <span className="stat-label">Current Block</span>
          <span className="stat-value">{blockInfo.currentBlock}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Votes</span>
          <span className="stat-value">{blockInfo.totalVotes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Network Status</span>
          <span className={`stat-value ${blockInfo.networkStatus.toLowerCase()}`}>
            {blockInfo.networkStatus}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Update</span>
          <span className="stat-value">
            {new Date(blockInfo.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
} 