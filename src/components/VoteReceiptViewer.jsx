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
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const receiptsPerPage = 10;

  useEffect(() => {
    async function fetchVotes() {
      try {
        console.log('Fetching votes for user:', user.email);
        setLoading(true);
        
        // Initialize blockchain if needed
        await blockchainService.initialize();
        
        // Get votes from the blockchain service using our new method
        const userVotes = blockchainService.getVoteReceiptsForVoter(user.email);
        console.log('User receipts found:', userVotes.length);
        
        // Process votes to ensure confirmation status is consistent
        const processedVotes = userVotes.map(vote => {
          // Explicitly mark as confirmed if it has a blockNumber or confirmed property
          if (vote.blockNumber || vote.confirmed) {
            return {
              ...vote,
              confirmed: true,
              pending: false
            };
          }
          return vote;
        });
        
        setVotes(processedVotes);
        setLoading(false);
        setLastUpdated(new Date());
        
        // Select the first vote by default if available
        if (processedVotes.length > 0) {
          setSelectedVote(processedVotes[0]);
        }
      } catch (error) {
        console.error('Error fetching votes:', error);
        setError('Failed to load your voting history. Please try again later.');
        setLoading(false);
      }
    }

    // Set up event listeners for receipt updates
    const setupListeners = () => {
      const handleVoteReceiptSaved = (event) => {
        console.log('Vote receipt saved event detected');
        fetchVotes();
      };
      
      const handleVoteConfirmed = (event) => {
        console.log('Vote confirmed event detected');
        fetchVotes();
      };
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Page became visible, refreshing vote receipts');
          fetchVotes();
        }
      };

      // Add event listeners
      window.addEventListener('voteReceiptSaved', handleVoteReceiptSaved);
      window.addEventListener('voteConfirmed', handleVoteConfirmed);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('voteReceiptSaved', handleVoteReceiptSaved);
        window.removeEventListener('voteConfirmed', handleVoteConfirmed);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    if (user?.email) {
      fetchVotes();
      
      // Set up event listeners
      const cleanup = setupListeners();
      
      // Return cleanup function
      return cleanup;
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
  
  // Helper function to check if a vote is confirmed
  const isVoteConfirmed = (vote) => {
    return vote.confirmed || vote.blockNumber || (vote.pending === false);
  };
  
  // Function to refresh votes (can be called by a button)
  const refreshVotes = () => {
    console.log('Manual refresh requested');
    setLoading(true);
    setError(null);
    
    // Fetch votes directly from blockchain again
    async function fetchVotes() {
      try {
        // Initialize blockchain and get votes
        await blockchainService.initialize();
        
        // Get votes using our new method
        const userVotes = blockchainService.getVoteReceiptsForVoter(user.email);
        
        // Process votes to ensure confirmation status is consistent
        const processedVotes = userVotes.map(vote => {
          // Explicitly mark as confirmed if it has a blockNumber or confirmed property
          if (vote.blockNumber || vote.confirmed) {
            return {
              ...vote,
              confirmed: true,
              pending: false
            };
          }
          return vote;
        });
        
        setVotes(processedVotes);
        setLastUpdated(new Date());
        
        // Keep current selection if it exists
        if (selectedVote && processedVotes.length > 0) {
          const voteTxId = selectedVote.txId || selectedVote.transactionHash;
          
          // Try to find the same vote in the new data
          const updatedVote = processedVotes.find(v => 
            (v.txId && voteTxId && v.txId === voteTxId) ||
            (v.transactionHash && voteTxId && v.transactionHash === voteTxId)
          );
          
          if (updatedVote) {
            setSelectedVote(updatedVote);
          } else if (processedVotes.length > 0) {
            // If not found, select first vote
            setSelectedVote(processedVotes[0]);
          } else {
            // If no votes, clear selection
            setSelectedVote(null);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error refreshing votes:', error);
        setError('Failed to refresh your voting history. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchVotes();
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
      
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <button 
          onClick={refreshVotes}
          className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-sm font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Receipts
        </button>
      </div>
      
      {votes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 mb-2">You haven't cast any votes yet.</p>
            <a href="/vote" className="text-indigo-600 hover:text-indigo-800 mt-2 inline-block font-medium">
              Go to Voting Page
            </a>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Voting History</h3>
            <div className="max-h-96 overflow-y-auto pr-2 mb-4">
              <div className="grid gap-4">
                {currentVotes.map((vote) => (
                  <div
                    key={vote.txId || vote.transactionHash || `vote-${vote.timestamp}`}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedVote && (
                        (selectedVote.txId && vote.txId && selectedVote.txId === vote.txId) || 
                        (selectedVote.transactionHash && vote.transactionHash && selectedVote.transactionHash === vote.transactionHash) ||
                        (!selectedVote.txId && !vote.txId && !selectedVote.transactionHash && !vote.transactionHash && selectedVote.timestamp === vote.timestamp)
                      )
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
                        
                        {(vote.txId || vote.transactionHash) && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            TX: {(vote.txId || vote.transactionHash).substring(0, 10)}...
                          </div>
                        )}
                        
                        {isVoteConfirmed(vote) && (
                          <div className="text-xs text-green-600 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {vote.blockNumber ? `Confirmed (Block: ${vote.blockNumber})` : 'Confirmed'}
                          </div>
                        )}
                        
                        {!isVoteConfirmed(vote) && vote.pending && (
                          <div className="text-xs text-amber-600 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending confirmation
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
              <VoteReceipt transactionData={{
                ...selectedVote,
                confirmed: isVoteConfirmed(selectedVote),
                pending: !isVoteConfirmed(selectedVote) && selectedVote.pending
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
} 