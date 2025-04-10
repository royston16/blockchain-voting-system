import { useState, useEffect } from 'react';
import blockchainService from '../blockchain/ethereum-service';
import VoteReceipt from './VoteReceipt';

//method to display the viewer for the vote receipts
//directly on the front end interface
export default function VoteReceiptViewer({ user }) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVote, setSelectedVote] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const receiptsPerPage = 10;

  useEffect(() => {
    async function fetchVotes() {
      try {
        console.log('Fetching votes for user:', user.email);
        
        // Get votes from localStorage
        const localVotes = getLocalStorageVotes();
        console.log('Votes from localStorage:', localVotes.length);
        
        // Get votes from blockchain
        await blockchainService.initialize();
        const response = await blockchainService.getAllVotes();
        
        // Extract the votes array from the response
        const allVotes = response.votes || [];
        
        // Filter the votes for the current user using the improved matching logic
        const blockchainVotes = allVotes.filter(vote => {
          // Match the votes based on either:
          // 1. original voter email (most reliable)
          // 2. voter ID contains part of the email
          return (
            (vote.originalVoter && vote.originalVoter === user.email) ||
            (vote.voterId && vote.voterId.includes(user.email))
          );
        });
        
        console.log('Votes from blockchain:', blockchainVotes.length);
        
        // Merge votes from both sources, avoiding duplicates
        const mergedVotes = mergeVotes(localVotes, blockchainVotes);
        console.log('Total merged votes:', mergedVotes.length);
        
        // Sort votes by timestamp (newest first)
        const sortedVotes = mergedVotes.sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        setVotes(sortedVotes);
      } catch (error) {
        console.error('Error fetching votes:', error);
        // If blockchain fetch fails, still show localStorage votes
        const localVotes = getLocalStorageVotes();
        if (localVotes.length > 0) {
          console.log('Using only localStorage votes due to error:', localVotes.length);
          setVotes(localVotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
          setError('Failed to load blockchain votes. Showing locally stored votes. ' + error.message);
        } else {
          setError('Failed to load your voting history. ' + error.message);
          setVotes([]); // Ensure votes is always an array
        }
      } finally {
        setLoading(false);
      }
    }

    if (user && user.email) {
      fetchVotes();
    } else {
      setLoading(false);
      setError('User information not available');
    }
  }, [user]);
  
  // Get current votes for pagination
  const indexOfLastReceipt = currentPage * receiptsPerPage;
  const indexOfFirstReceipt = indexOfLastReceipt - receiptsPerPage;
  const currentVotes = votes.slice(indexOfFirstReceipt, indexOfLastReceipt);
  const totalPages = Math.ceil(votes.length / receiptsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Function to close the selected receipt
  const closeReceipt = () => {
    setSelectedVote(null);
  };
  
  // Function to get votes from localStorage
  const getLocalStorageVotes = () => {
    try {
      const savedVotesString = localStorage.getItem('userVotes');
      if (!savedVotesString) return [];
      
      const savedVotes = JSON.parse(savedVotesString);
      if (!Array.isArray(savedVotes)) return [];
      
      // Filter for this specific user
      return savedVotes.filter(vote => 
        (vote.originalVoter && vote.originalVoter === user.email) || 
        (vote.voterId && vote.voterId.includes(user.email))
      );
    } catch (error) {
      console.error('Error reading votes from localStorage:', error);
      return [];
    }
  };
  
  // Function to merge votes from local storage and blockchain
  const mergeVotes = (localVotes, blockchainVotes) => {
    const allVotes = [...localVotes];
    
    // Add blockchain votes if they don't already exist in local votes
    blockchainVotes.forEach(blockchainVote => {
      const exists = allVotes.some(localVote => 
        // Check by transaction ID if available
        (blockchainVote.txId && localVote.txId && blockchainVote.txId === localVote.txId) ||
        // Or by timestamp if not
        (blockchainVote.timestamp && localVote.timestamp && 
         new Date(blockchainVote.timestamp).getTime() === new Date(localVote.timestamp).getTime())
      );
      
      if (!exists) {
        allVotes.push(blockchainVote);
      }
    });
    
    return allVotes;
  };

  // Function to get candidate display name
  const getCandidateDisplay = (vote) => {
    if (!vote.candidate && !vote.candidateId) return 'Unknown Candidate';
    
    const candidateValue = vote.candidate || vote.candidateId;
    
    // If candidate is A, B, C format
    if (typeof candidateValue === 'string' && /^[A-Z]$/.test(candidateValue)) {
      return `Candidate ${candidateValue}`;
    }
    
    // If candidate is a number (index)
    if (typeof candidateValue === 'number' || !isNaN(candidateValue)) {
      const candidateNames = ['A', 'B', 'C'];
      const index = parseInt(candidateValue, 10);
      return `Candidate ${candidateNames[index] || index}`;
    }
    
    // If it starts with "Candidate", use as is
    if (typeof candidateValue === 'string' && candidateValue.startsWith('Candidate ')) {
      return candidateValue;
    }
    
    // Default case
    return `Candidate ${candidateValue}`;
  };
  
  // Function to refresh votes (can be called by a button)
  const refreshVotes = () => {
    setLoading(true);
    setError(null);
    setSelectedVote(null);
    // The useEffect will run again
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your voting history...</p>
        </div>
      </div>
    );
  }

  if (error && votes.length === 0) {
    return (
      <div className="card">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Your Vote Receipts</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="mb-4 flex justify-end">
        <button 
          onClick={refreshVotes}
          className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-sm font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {votes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">You haven't cast any votes yet.</p>
          <a href="/vote" className="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
            Go to Voting Page
          </a>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Voting History</h3>
            <div className="max-h-96 overflow-y-auto pr-2 mb-4">
              <div className="grid gap-4">
                {currentVotes.map((vote) => (
                  <div
                    key={vote.txId || `vote-${vote.timestamp}`}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedVote && (selectedVote.txId === vote.txId || 
                       (!selectedVote.txId && !vote.txId && selectedVote.timestamp === vote.timestamp))
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-gray-200 hover:border-indigo-200'
                    }`}
                    onClick={() => setSelectedVote(vote)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{getCandidateDisplay(vote)}</p>
                        <div className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(vote.timestamp).toLocaleString()}
                        </div>
                        
                        {vote.txId && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            TX: {vote.txId.substring(0, 10)}...
                          </div>
                        )}
                        
                        {vote.savedAt && (
                          <div className="text-xs text-blue-500 mt-1">
                            Saved locally: {new Date(vote.savedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <button
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm font-medium"
                        onClick={(e) => {
                          e.stopPropagation(); //prevent triggering the parent onClick
                          setSelectedVote(vote);
                        }}
                      >
                        View Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <nav className="flex items-center">
                  <button 
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === 1 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="mx-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <button 
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === totalPages 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>

          {selectedVote && (
            <div className="mt-6 p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-lg relative">
              <button
                onClick={closeReceipt}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                aria-label="Close receipt"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <VoteReceipt transactionData={selectedVote} />
            </div>
          )}
        </div>
      )}
    </div>
  );
} 