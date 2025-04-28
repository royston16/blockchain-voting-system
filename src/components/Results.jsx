import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/ethereum-service'

//method to display the results of the election
export default function Results() {
  const [results, setResults] = useState({})
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [votesPerPage] = useState(10)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Function to fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      //initialize the blockchain connection if needed
      await blockchainService.initialize()
      
      //get the results and all votes directly from the blockchain
      const resultsData = await blockchainService.getResults()
      console.log('Results data from blockchain:', resultsData)
      
      //handle the results format when it is available
      if (resultsData && resultsData.results) {
        setResults(resultsData.results)
      } else {
        //if there's no results property, use the whole object as results (default as 0)
        setResults(resultsData || { "Total Votes": "0" })
      }
      
      //get the votes from the blockchain service - now includes both pending and confirmed
      const votesData = await blockchainService.getAllVotes(1000, 0)
      console.log('Votes data from blockchain service:', votesData)
      
      //handle the votes format
      if (votesData && Array.isArray(votesData.votes)) {
        setVotes(votesData.votes)
      } else if (Array.isArray(votesData)) {
        setVotes(votesData)
      } else {
        setVotes([])
      }
      
      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Error fetching election results:', err)
      setError(err.message || 'Failed to fetch results')
      setLoading(false)
    }
  }
  
  // Set up event listeners for vote data changes
  const setupEventListeners = () => {
    // Listen for vote confirmations
    const handleVoteConfirmed = () => {
      console.log('Vote confirmation detected, refreshing results');
      fetchData();
    };
    
    // Listen for general vote data updates (from caches, other tabs, etc.)
    const handleVoteDataUpdated = () => {
      console.log('Vote data updated, refreshing results');
      fetchData();
    };
    
    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Results page became visible, refreshing data');
        fetchData();
      }
    };
    
    // Add all event listeners
    window.addEventListener('voteConfirmed', handleVoteConfirmed);
    window.addEventListener('voteDataUpdated', handleVoteDataUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up all listeners on unmount
    return () => {
      window.removeEventListener('voteConfirmed', handleVoteConfirmed);
      window.removeEventListener('voteDataUpdated', handleVoteDataUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  };
  
  useEffect(() => {
    // Initial data fetch
    fetchData()
    
    // Set up all event listeners
    const cleanupListeners = setupEventListeners();
    
    // Set up refresh interval
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
    
    // Clean up on component unmount
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      cleanupListeners();
    }
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
  
  // Format the time for display
  const formatTime = (time) => {
    if (!time) return '';
    try {
      return new Date(time).toLocaleTimeString();
    } catch (e) {
      return time.toString();
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

  // Handle manual refresh button click
  const handleRefresh = () => {
    console.log('Manual refresh requested');
    fetchData();
  };

  // Pagination logic
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate current votes to display based on pagination
  const indexOfLastVote = currentPage * votesPerPage;
  const indexOfFirstVote = indexOfLastVote - votesPerPage;
  const currentVotes = votes.slice(indexOfFirstVote, indexOfLastVote);
  const totalPages = Math.ceil(votes.length / votesPerPage);

  //front end display of the results
  return (
    <div className="w-full max-w-none">
      <BlockchainInfo />
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Election Results</h2>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Refresh Results
          </button>
        </div>
        
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
                    candidate === "Candidate A" || candidate === "A" ? "bg-blue-600" :
                    candidate === "Candidate B" || candidate === "B" ? "bg-green-600" :
                    candidate === "Candidate C" || candidate === "C" ? "bg-purple-600" : "bg-indigo-600";
                  
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
                {votes.filter(v => v.pending).length > 0 && (
                  <div className="text-sm text-amber-600 mt-1">
                    +{votes.filter(v => v.pending).length} pending
                  </div>
                )}
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <div className="text-sm text-gray-600 mb-1">Last Update</div>
                <div className="text-xl font-bold text-indigo-600">
                  {formatTime(lastUpdated)}
                </div>
              </div>
            </div>
            
            {votes.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Ethereum Blockchain Votes</h3>
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstVote + 1} to {Math.min(indexOfLastVote, votes.length)} of {votes.length} votes
                    <span className="ml-2 text-indigo-600">(Oldest first)</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">This list shows all votes cast without revealing voter identities, displayed in chronological order (oldest first).</p>
                
                <div className="border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th scope="col" className="sticky top-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentVotes.map((vote, index) => (
                        <tr key={vote.txId || vote.transactionHash || index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">
                              {formatId(vote.txId || vote.transactionHash, 'tx')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCandidate(vote.candidateId || vote.candidate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(vote.timestamp).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {vote.pending ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Confirmed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {votes.length > votesPerPage && (
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === 1 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Improved pagination with the requested sliding window pattern */}
                      {totalPages <= 7 ? (
                        // If 7 or fewer pages, show all pages
                        [...Array(totalPages).keys()].map(number => (
                          <button
                            key={number + 1}
                            onClick={() => paginate(number + 1)}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === number + 1
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {number + 1}
                          </button>
                        ))
                      ) : (
                        <>
                          {/* Current page is in first 3 pages */}
                          {currentPage <= 3 && (
                            <>
                              {/* First 3 pages */}
                              {[1, 2, 3].map(number => (
                                <button
                                  key={number}
                                  onClick={() => paginate(number)}
                                  className={`px-3 py-1 rounded-md ${
                                    currentPage === number
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                              <span className="px-3 py-1">...</span>
                            </>
                          )}
                          
                          {/* Current page is in middle (not in first 3 or last 3) */}
                          {currentPage > 3 && currentPage < totalPages - 2 && (
                            <>
                              {/* Window of 3 pages centered around current page */}
                              {[currentPage - 1, currentPage, currentPage + 1].map(number => (
                                <button
                                  key={number}
                                  onClick={() => paginate(number)}
                                  className={`px-3 py-1 rounded-md ${
                                    currentPage === number
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                              <span className="px-3 py-1">...</span>
                            </>
                          )}
                          
                          {/* Current page is in last 3 pages */}
                          {currentPage >= totalPages - 2 && (
                            <>
                              <span className="px-3 py-1">...</span>
                            </>
                          )}
                          
                          {/* Last 3 pages - always show */}
                          {[totalPages - 2, totalPages - 1, totalPages].map(number => (
                            <button
                              key={number}
                              onClick={() => paginate(number)}
                              className={`px-3 py-1 rounded-md ${
                                currentPage === number
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {number}
                            </button>
                          ))}
                        </>
                      )}
                      
                      <button
                        onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === totalPages 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}