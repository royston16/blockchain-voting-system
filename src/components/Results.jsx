export default function Results({ votes }) {
    const getResults = () => {
      const result = {}
      votes.forEach(vote => {
        result[vote.candidate] = (result[vote.candidate] || 0) + 1
      })
      return result
    }
  
    const results = getResults()
  
    return (
      <div className="card">
        <h2>Election Results</h2>
        <div style={{ marginTop: '20px' }}>
          {Object.entries(results).map(([candidate, votes]) => (
            <div key={candidate} style={{ margin: '10px 0' }}>
              {candidate}: {votes} votes
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', color: '#666' }}>
          Total Votes Cast: {votes.length}
        </div>
      </div>
    )
  }