import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import blockchainService from '../blockchain/ethereum-service';

function Admin() {
  const [blockchainInfo, setBlockchainInfo] = useState({});
  const [votes, setVotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const votesPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Get blockchain connection info
        const info = blockchainService.getConnectionInfo();
        setBlockchainInfo(info);
        
        // Get vote data
        const voteData = await blockchainService.getAllVotes(100, 0);
        setVotes(voteData.votes || []);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
    
    // Set up event listeners for contract and vote updates
    window.addEventListener('contractDataCleared', fetchData);
    window.addEventListener('voteDataUpdated', fetchData);
    
    return () => {
      window.removeEventListener('contractDataCleared', fetchData);
      window.removeEventListener('voteDataUpdated', fetchData);
    };
  }, []);

  // Calculate pagination
  const indexOfLastVote = currentPage * votesPerPage;
  const indexOfFirstVote = indexOfLastVote - votesPerPage;
  const currentVotes = votes.slice(indexOfFirstVote, indexOfLastVote);
  const totalPages = Math.ceil(votes.length / votesPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Administrator Dashboard</h1>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <Link 
            to="/chain" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Blockchain Verification
          </Link>
          <Link 
            to="/receipts" 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Blockchain Explorer
          </Link>
          <Link 
            to="/results" 
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            View Results
          </Link>
          <Link 
            to="/admin/configuration" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Configuration
          </Link>
        </div>
      </div>
      
      <div className="mb-8">
        <AdminPanel />
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Blockchain Status</h2>
        
        {isLoading ? (
          <p className="text-gray-600">Loading blockchain info...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Connection Details</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Network:</div>
                  <div className="text-sm text-gray-600">
                    {blockchainInfo.networkDetails?.name || 'Unknown'}
                  </div>
                  
                  <div className="text-sm font-medium">Chain ID:</div>
                  <div className="text-sm text-gray-600">
                    {blockchainInfo.networkDetails?.chainId || 'Unknown'}
                  </div>
                  
                  <div className="text-sm font-medium">Contract:</div>
                  <div className="text-sm text-gray-600 truncate">
                    {blockchainInfo.contractAddress || 'Not deployed'}
                  </div>
                  
                  <div className="text-sm font-medium">Connection:</div>
                  <div className="text-sm text-gray-600">
                    {blockchainInfo.connected ? 'Connected' : 'Disconnected'}
                  </div>
                  
                  <div className="text-sm font-medium">Mode:</div>
                  <div className="text-sm text-gray-600">
                    {blockchainInfo.networkDetails?.readOnly ? 'Read-only' : 'Read-write'}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Vote Statistics</h3>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Total Votes:</div>
                  <div className="text-sm text-gray-600">
                    {votes.length}
                  </div>
                  
                  <div className="text-sm font-medium">Pending Votes:</div>
                  <div className="text-sm text-gray-600">
                    {votes.filter(v => v.pending).length}
                  </div>
                  
                  <div className="text-sm font-medium">Confirmed Votes:</div>
                  <div className="text-sm text-gray-600">
                    {votes.filter(v => !v.pending).length}
                  </div>
                  
                  <div className="text-sm font-medium">Latest Vote:</div>
                  <div className="text-sm text-gray-600">
                    {votes.length > 0 
                      ? new Date(votes[0].timestamp).toLocaleString() 
                      : 'No votes cast'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Votes</h2>
        
        {isLoading ? (
          <p className="text-gray-600">Loading votes...</p>
        ) : votes.length === 0 ? (
          <p className="text-gray-600">No votes have been cast yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voter ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentVotes.map((vote, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(vote.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof vote.voterId === 'string' 
                        ? vote.voterId.substring(0, 8) + '...' 
                        : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.candidateId || 'Unknown'}
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
            
            {votes.length > votesPerPage && (
              <div className="flex justify-between items-center mt-4 px-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstVote + 1}</span> to{' '}
                  <span className="font-medium">
                    {indexOfLastVote > votes.length ? votes.length : indexOfLastVote}
                  </span>{' '}
                  of <span className="font-medium">{votes.length}</span> votes
                </div>
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
      </div>
    </div>
  );
}

export default Admin; 