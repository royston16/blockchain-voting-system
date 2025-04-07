import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/fabric-gateway'

export default function Results() {
  const [results, setResults] = useState({})
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [displayedVotes, setDisplayedVotes] = useState(10)

  useEffect(() => {
    async function fetchData() {
      try {
        // Initialize blockchain connection if needed
        await blockchainService.initialize()
        
        // Get results and all votes
        const resultsData = await blockchainService.getResults()
        setResults(resultsData)
        
        const votesData = await blockchainService.getAllVotes()
        setVotes(votesData)
      } catch (error) {
        console.error('Error fetching blockchain data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const getPercentage = (votes) => {
    const total = Object.values(results).reduce((a, b) => a + b, 0)
    return total > 0 ? ((votes / total) * 100).toFixed(1) : 0
  }

  const loadMoreVotes = () => {
    setDisplayedVotes(prev => Math.min(prev + 10, votes.length))
  }

  const formatId = (id, type = 'tx') => {
    if (!id) return 'N/A';
    if (id.length <= 16) return id;
    
    // Different formatting for different ID types
    if (type === 'voter') {
      // For voter hashes, show first 6 and last 4 characters
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    } else if (type === 'session') {
      // For session IDs, show first 8 characters
      return `${id.substring(0, 8)}...`;
    } else {
      // For transaction IDs, show first 8 and last 8 characters
      return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
    }
  };

  return (
    <div className="w-full max-w-none">
      <BlockchainInfo />
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Election Results</h2>
        {loading ? (
          <div className="loading">Loading results from blockchain...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(results).map(([candidate, votes]) => (
                <div key={candidate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold mb-3">Candidate {candidate}</h3>
                  <div className="text-3xl font-bold text-indigo-600 mb-4">{votes} votes</div>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-3 text-xs flex rounded bg-indigo-100">
                      <div 
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                        style={{ width: `${getPercentage(votes)}%` }}
                      />
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-sm font-semibold text-indigo-600">{getPercentage(votes)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Total Votes Cast</div>
                <div className="text-3xl font-bold text-indigo-600">{votes.length}</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Block Height</div>
                <div className="text-3xl font-bold text-indigo-600">{votes.length}</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Last Update</div>
                <div className="text-xl font-bold text-indigo-600">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            {votes.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Anonymized Voter Ledger</h3>
                  <div className="text-sm text-gray-500">
                    Showing {Math.min(displayedVotes, votes.length)} of {votes.length} votes
                  </div>
                </div>
                <p className="text-gray-600 mb-6">This list shows all votes cast without revealing voter identities.</p>
                
                <div className="border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                          Transaction ID
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                          Voter Hash
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                          Session ID
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                          Candidate
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td colSpan="5" className="p-0">
                          <div className={votes.length > 10 ? "max-h-[400px] overflow-y-auto" : ""}>
                            <table className="min-w-full divide-y divide-gray-200">
                              <tbody>
                                {votes.slice(0, displayedVotes).map((vote, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[25%]">
                                      {formatId(vote.txId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[20%] text-indigo-600">
                                      {formatId(vote.voterId, 'voter')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[20%] text-gray-500">
                                      {formatId(vote.sessionId, 'session')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm w-[15%]">
                                      Candidate {vote.candidate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-[20%]">
                                      {new Date(vote.timestamp).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {votes.length > displayedVotes && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMoreVotes}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Load More Votes
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}