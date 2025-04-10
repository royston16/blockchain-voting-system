import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/ethereum-service'

//method to display the results of the election
export default function Results() {
  const [results, setResults] = useState({})
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [displayedVotes, setDisplayedVotes] = useState(10)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        
        //initialize the blockchain connection if needed
        await blockchainService.initialize()
        
        //get the results and all votes
        const resultsData = await blockchainService.getResults()
        console.log('Results data:', resultsData)
        
        //handle the results format when it is available
        if (resultsData && resultsData.results) {
          setResults(resultsData.results)
        } else {
          //if there's no results property, use the whole object as results (default as 0)
          setResults(resultsData || { "Total Votes": "0" })
        }
        
        //get the votes from the blockchain only
        const votesData = await blockchainService.getAllVotes()
        console.log('Votes data from blockchain:', votesData)
        
        //handle the votes format
        let blockchainVotes = []
        
        //if the votes data is an array, use it directly
        if (votesData && Array.isArray(votesData.votes)) {
          blockchainVotes = [...votesData.votes]
        } else if (Array.isArray(votesData)) {
          blockchainVotes = [...votesData]
        }
        
        //sort the votes from oldest to newest based on timestamp
        blockchainVotes.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB; //ascending order (oldest first)
        });
        
        setVotes(blockchainVotes)
      
        //if there is an error, set the error message and clear the votes and results
      } catch (error) {
        console.error('Error fetching blockchain data:', error)
        setError('Failed to load election results from the blockchain. Please try again later.')
        setVotes([])
        setResults({ "Total Votes": "0" })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  //display the percentage of votes for each candidate
  const getPercentage = (votes) => {
    const totalVotesCount = getTotalVotes()
    return totalVotesCount > 0 ? ((parseInt(votes) / totalVotesCount) * 100).toFixed(1) : 0
  }
  
  //get the total votes from the results
  const getTotalVotes = () => {
    if (!results) return 0
    
    //if the results have a "Total Votes" property, use that
    if (results["Total Votes"]) {
      return parseInt(results["Total Votes"])
    }
    
    //otherwise, sum up all the votes
    return Object.values(results).reduce((total, count) => total + parseInt(count || 0), 0)
  }

  //method to load more votes
  const loadMoreVotes = () => {
    setDisplayedVotes(prev => Math.min(prev + 10, votes.length))
  }

  //method to format the ID of the voter, session, or transaction
  const formatId = (id, type = 'tx') => {
    if (!id) return 'N/A';
    if (id.length <= 16) return id;
    
    //different formatting for different ID types
    if (type === 'voter') {
      //for voter hashes, show first 6 and last 4 characters
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    } else if (type === 'session') {
      //for session IDs, show first 8 characters
      return `${id.substring(0, 8)}...`;
    } else {
      //for transaction IDs, show first 8 and last 8 characters
      return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
    }
  };
  
  //format the candidate name to be displayed
  const formatCandidate = (candidate) => {
    if (!candidate) return 'Unknown';
    
    //if it is already in "Candidate X" format, use as is
    if (typeof candidate === 'string' && candidate.startsWith('Candidate ')) {
      return candidate;
    }
    
    //if it is a single letter A, B, C format
    if (typeof candidate === 'string' && /^[A-Z]$/.test(candidate)) {
      return `Candidate ${candidate}`;
    }
    
    //default format (use the candidate name)
    return `Candidate ${candidate}`;
  };

  //front end display of the results
  return (
    <div className="w-full max-w-none">
      <BlockchainInfo />
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Election Results</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading results from blockchain...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(results)
                .filter(([candidate]) => candidate !== "Total Votes") // Filter out the total votes
                .map(([candidate, votes]) => {
                  const candidateColor = 
                    candidate === "Candidate A" ? "bg-blue-600" :
                    candidate === "Candidate B" ? "bg-green-600" :
                    candidate === "Candidate C" ? "bg-purple-600" : "bg-indigo-600";
                  
                  return (
                    <div key={candidate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                      <h3 className="text-xl font-semibold mb-3">{formatCandidate(candidate)}</h3>
                      <div className="text-3xl font-bold text-indigo-600 mb-4">{votes} votes</div>
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-3 text-xs flex rounded bg-indigo-100">
                          <div 
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${candidateColor}`}
                            style={{ width: `${getPercentage(votes)}%` }}
                          />
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-sm font-semibold text-indigo-600">{getPercentage(votes)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Total Votes Cast</div>
                <div className="text-3xl font-bold text-indigo-600">{results["Total Votes"] || getTotalVotes()}</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Vote Records</div>
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
                  <h3 className="text-xl font-bold">Ethereum Blockchain Votes</h3>
                  <div className="text-sm text-gray-500">
                    Showing {Math.min(displayedVotes, votes.length)} of {votes.length} votes
                    <span className="ml-2 text-indigo-600">(Oldest first)</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">This list shows all votes cast without revealing voter identities, displayed in chronological order (oldest first).</p>
                
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
                                  <tr key={index} className={`hover:bg-gray-50`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[25%]">
                                      {formatId(vote.txId || vote.transactionId || vote.transactionHash)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[20%] text-indigo-600">
                                      {formatId(vote.voterId, 'voter')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono w-[20%] text-gray-500">
                                      {formatId(vote.sessionId, 'session')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm w-[15%]">
                                      {formatCandidate(vote.candidate || vote.candidateId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-[20%]">
                                      <div className="text-sm">
                                        {new Date(vote.timestamp).toLocaleString()}
                                        {vote.voteTimestamp && vote.voteTimestamp !== vote.timestamp && (
                                          <div className="text-xs text-gray-400 mt-1">
                                            Initiated: {new Date(vote.voteTimestamp).toLocaleString()}
                                          </div>
                                        )}
                                      </div>
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