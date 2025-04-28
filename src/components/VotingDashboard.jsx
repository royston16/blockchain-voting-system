import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/ethereum-service'
import VoteReceipt from './VoteReceipt'
import { Link } from 'react-router-dom'

// Development mode flag - set to true to allow multiple votes in frontend
const DEV_MODE = true;

//method to create a secure hash of the voter's email
const createVoterHash = async (email) => {
  try {
    //use the browser's built-in crypto API to create a SHA-256 hash
    const msgBuffer = new TextEncoder().encode(email + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    
    //convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `vh-${hashHex.substring(0, 40)}`; //return a shorter, prefixed version
  } catch (error) {
    console.error('Error creating voter hash:', error);
    //fallback to a simple hash if the crypto API fails
    return `vh-${email.split('').reduce((a, b) => (a * 21 + b.charCodeAt(0)) % 1000000, 0)}`;
  }
}

//the front end interface for the voting dashboard
export default function VotingDashboard({ user, votes, setVotes }) {
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [votingStatus, setVotingStatus] = useState('ready')
  const [transactionData, setTransactionData] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [previousUser, setPreviousUser] = useState(null)
  const [voterHash, setVoterHash] = useState('') //store the voter hash
  const [userVoteCount, setUserVoteCount] = useState(0) // Track how many votes user has cast
  
  //the candidates for the election
  const candidates = [
    { id: 'A', name: 'Candidate A', party: 'Party 1', description: 'Experienced leader with proven track record' },
    { id: 'B', name: 'Candidate B', party: 'Party 2', description: 'Fresh perspective and innovative ideas' },
    { id: 'C', name: 'Candidate C', party: 'Party 3', description: 'Focus on economic development and stability' }
  ]

  //reset the state when the user changes
  useEffect(() => {
    if (user && previousUser && user.email !== previousUser.email) {
      //different user logged in, reset the state
      setHasVoted(false);
      setSelectedCandidate('');
      setTransactionData(null);
      setShowReceipt(false);
      setVotingStatus('ready');
      setStatusMessage('');
      setSessionInfo(null);
      setVoterHash(''); //reset the voter hash
      setUserVoteCount(0);
    }
    
    //generate the voter hash when the user changes
    const generateHash = async () => {
      if (user && user.email) {
        const hash = await createVoterHash(user.email);
        setVoterHash(hash);
        console.log('Generated voter hash:', hash);
      }
    };
    
    if (user && user.email) {
      generateHash();
    }
    
    setPreviousUser(user);
    
    // Listen for contract data cleared event
    const handleContractDataCleared = () => {
      console.log('Contract data cleared event received, resetting voting dashboard');
      // Reset all voting state
      setHasVoted(false);
      setSelectedCandidate('');
      setTransactionData(null);
      setShowReceipt(false);
      setVotingStatus('ready');
      setStatusMessage('');
      setSessionInfo(null);
      setVoterHash('');
      setUserVoteCount(0);
    };
    
    // Add event listener
    window.addEventListener('contractDataCleared', handleContractDataCleared);
    
    // Cleanup
    return () => {
      window.removeEventListener('contractDataCleared', handleContractDataCleared);
    };
  }, [user, previousUser]);

  //initialize the blockchain service and check the vote status when the component mounts
  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        await blockchainService.initialize();
        
        //wait until the voter hash is generated and the user is logged in
        if (!voterHash && user?.email) {
          const hash = await createVoterHash(user.email);
          setVoterHash(hash);
        }
        
        // Get user's vote receipts
        if (user?.email) {
          const userReceipts = blockchainService.getVoteReceiptsForVoter(user.email);
          setUserVoteCount(userReceipts.length);
          
          // Check for existing votes by this user's hash or email
          if (userReceipts.length > 0 && !DEV_MODE) {
            // In production mode, show that user has already voted
            setHasVoted(true);
            setStatusMessage('You have already cast your vote.');
            setVotingStatus('completed');
            
            //show the most recent vote's receipt
            const mostRecentVote = userReceipts[0]; // Already sorted newest first
            setTransactionData(mostRecentVote);
            setShowReceipt(true);
            
            //set the session info from the vote, generate session ID if not present
            setSessionInfo({
              voterId: voterHash || mostRecentVote.voterId,
              sessionId: mostRecentVote.sessionId || `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              timestamp: mostRecentVote.timestamp || Date.now()
            });
          } else if (userReceipts.length > 0 && DEV_MODE) {
            // In development mode, show receipt of last vote but allow new votes
            console.log(`DEV MODE: User has ${userReceipts.length} previous votes but allowing new votes`);
            // Set the most recent vote for display but don't block new votes
            const mostRecentVote = userReceipts[0];
            setTransactionData(mostRecentVote);
            // Don't set hasVoted to true so user can vote again
            setVotingStatus('ready');
            setStatusMessage('');
          }
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
        setStatusMessage('Could not check voting status. Please try again later.');
      }
    };
    
    //check the vote status if the user is logged in and we have a voter hash
    if (user && user.email) {
      checkVoteStatus();
    }
  }, [user, voterHash]);

  //method to handle the vote submission
  const handleVote = async () => {
    if (!selectedCandidate) {
      setStatusMessage('Please select a candidate');
      return;
    }
    
    // Skip the hasVoted check in development mode
    if (hasVoted && !DEV_MODE) {
      setStatusMessage('You have already cast your vote');
      return;
    }
    
    //generate a voter hash if not already created
    let currentVoterHash = voterHash;
    if (!currentVoterHash) {
      currentVoterHash = await createVoterHash(user.email);
      setVoterHash(currentVoterHash);
    }
    
    setStatusMessage('Submitting your vote... Please confirm the transaction in your wallet.');
    setVotingStatus('processing');
    
    try {
      console.log('Starting vote submission for user with hash:', currentVoterHash);
      
      // In DEV_MODE, generate a new voterHash for each vote to bypass blockchain contract's duplicate check
      if (DEV_MODE && userVoteCount > 0) {
        currentVoterHash = `${currentVoterHash}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        console.log('DEV MODE: Generated new voter hash to bypass contract duplicate check:', currentVoterHash);
      }
      
      //make sure we have a session ID to use
      const currentSessionId = sessionInfo?.sessionId || `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      //cast vote using the blockchain service - pass hashed voter ID and session ID
      const result = await blockchainService.castVote(
        currentVoterHash, 
        selectedCandidate, 
        currentSessionId,
        user.email  //pass the user email as the 4th parameter
      );
      console.log('Vote cast result:', result);
      
      //check if the vote was successful
      if (!result.success) {
        //handle the error with user-friendly messages
        setVotingStatus('error');
        
        let errorMsg = result.error || 'Failed to cast vote. Please try again later.';
        
        //provide more specific error messages for common issues
        if (errorMsg.includes('MetaMask RPC error') || errorMsg.includes('Internal JSON-RPC error')) {
          errorMsg = 'Transaction failed. Please check that you have enough ETH for gas fees and try again.';
        } else if (errorMsg.includes('rejected')) {
          errorMsg = 'Transaction was rejected in your wallet. Please try again when ready.';
        } else if (errorMsg.includes('Contract not deployed')) {
          errorMsg = 'Voting contract is not deployed yet. Please wait for the administrator to set up the voting system.';
        } else if (errorMsg.includes('Voter has already cast a vote')) {
          // This should only happen if DEV_MODE is false, but handling just in case
          errorMsg = 'This voter has already cast a vote. This is likely a blockchain constraint.';
        }
        
        setStatusMessage(errorMsg);
        return;
      }
      
      //add the original voter email to the result for easier lookups
      const transaction = result.transaction;
      transaction.voterId = currentVoterHash; //make sure the hashed ID is used
      
      //map the blockchain transaction properties to the expected format for VoteReceipt
      transaction.transactionId = transaction.transactionHash;
      transaction.blockHash = transaction.blockHash || null;
      transaction.txId = transaction.transactionHash; //add txId which is expected by VoteReceipt
      
      //update the transaction data and show the receipt
      setTransactionData(transaction);
      setShowReceipt(true);
      
      //store the session information for display
      setSessionInfo({
        voterId: currentVoterHash,
        sessionId: transaction.sessionId || currentSessionId,
        timestamp: transaction.timestamp || Date.now()
      });
      
      // Explicitly save the vote receipt
      blockchainService.saveVoteReceipt(transaction, user.email);
      
      // Update the user vote count
      setUserVoteCount(prev => prev + 1);
      
      //update the states to reflect the successful vote
      setVotingStatus('completed');
      setSelectedCandidate('');
      
      // Only set hasVoted to true if not in development mode
      if (!DEV_MODE) {
        setHasVoted(true);
      }
      
      setStatusMessage('Your vote has been successfully recorded on the blockchain!');
      
    } catch (error) {
      console.error('Error casting vote:', error);
      setVotingStatus('error');
      
      //provide more user-friendly error messages when the user rejects an error or insufficient funds
      let errorMsg = error.message || 'An unknown error occurred';
      
      if (errorMsg.includes('user rejected') || errorMsg.includes('rejected')) {
        errorMsg = 'Transaction was rejected in your wallet.';
      } else if (errorMsg.includes('insufficient funds')) {
        errorMsg = 'Not enough ETH to pay for transaction fees.';
      }
      
      setStatusMessage(errorMsg);
    }
  }

  // Function to reset vote state (used in DEV_MODE to allow voting again)
  const resetVoteState = () => {
    setShowReceipt(false);
    setVotingStatus('ready');
    setStatusMessage('');
    setSelectedCandidate('');
  };

  //the front end interface for the voting dashboard
  return (
    <div>
      <BlockchainInfo />
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Cast Your Vote</h2>
          {userVoteCount > 0 && (
            <Link 
              to="/receipts" 
              className="text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Your Vote Receipts ({userVoteCount})
            </Link>
          )}
        </div>
        
        {/*status message for the voter to ensure the integrity of their vote*/}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            votingStatus === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
            votingStatus === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            votingStatus === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
            'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            <p className="text-center font-medium">{statusMessage}</p>
            
            {votingStatus === 'completed' && (
              <div className="text-center mt-2">
                <Link 
                  to="/receipts" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View all your vote receipts
                </Link>
                
                {/* In DEV_MODE, show button to vote again after successful vote */}
                {DEV_MODE && (
                  <button
                    onClick={resetVoteState}
                    className="ml-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Cast another vote (DEV MODE)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Only show the "already voted" message if there's no other status message and NOT in DEV_MODE */}
        {hasVoted && !statusMessage && !DEV_MODE && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 text-center">
            <p className="mb-2">You have already cast a vote in this election</p>
            <Link 
              to="/receipts" 
              className="text-indigo-700 hover:text-indigo-900 text-sm font-medium"
            >
              View your vote receipt
            </Link>
          </div>
        )}
        
        {/* Show candidate selection if in DEV_MODE or if the user hasn't voted */}
        {(DEV_MODE || !hasVoted) && !showReceipt && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`border p-4 rounded-lg cursor-pointer transition-all ${
                  selectedCandidate === candidate.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCandidate(candidate.id)}
              >
                <div className="flex items-center mb-3">
                  <div
                    className={`w-5 h-5 rounded-full mr-3 border ${
                      selectedCandidate === candidate.id
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedCandidate === candidate.id && (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-medium">{candidate.name}</div>
                </div>
                <div className="pl-8">
                  <div className="text-sm text-gray-600 mb-2">{candidate.party}</div>
                  <p className="text-sm text-gray-700">{candidate.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Show confirm button if in DEV_MODE or if the user hasn't voted */}
        {(DEV_MODE || !hasVoted) && !showReceipt && (
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={handleVote}
            disabled={!selectedCandidate || votingStatus === 'processing'}
          >
            {votingStatus === 'processing' ? 'Processing...' : 'Confirm Vote'}
          </button>
        )}
        
        {/* Show the receipt after voting */}
        {showReceipt && transactionData && (
          <div className="mt-4 pt-6 border-t border-gray-200">
            <VoteReceipt transactionData={transactionData} />
            
            {/* In DEV_MODE, show a button to cast another vote */}
            {DEV_MODE && (
              <div className="mt-4 text-center">
                <button
                  onClick={resetVoteState}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cast Another Vote (DEV MODE)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* DEV_MODE indicator */}
      {DEV_MODE && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-bold">Development Mode Active:</span>
            <span className="ml-2">Multiple voting is enabled for testing purposes only.</span>
          </div>
        </div>
      )}
    </div>
  );
}