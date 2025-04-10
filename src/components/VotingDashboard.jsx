import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/ethereum-service'
import VoteReceipt from './VoteReceipt'

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
  }, [user, previousUser]);

  //initialize the blockchain service and check the vote status when the component mounts
  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        await blockchainService.initialize();
        const response = await blockchainService.getAllVotes();
        
        //wait until the voter hash is generated and the user is logged in
        if (!voterHash && user?.email) {
          const hash = await createVoterHash(user.email);
          setVoterHash(hash);
        }
        
        //extract the votes array from the response
        const allVotes = response.votes || [];
        
        //check for existing votes by this user
        const userVotes = allVotes.filter(vote => {
          //check if this hash or email has already voted
          return (
            (vote.voterId && vote.voterId === voterHash) || 
            (vote.originalVoter && vote.originalVoter === user.email) ||
            (vote.voterId && vote.voterId.includes(user.email))
          );
        });
        
        if (userVotes.length > 0) {
          setHasVoted(true);
          setStatusMessage('You have already cast your vote.');
          setVotingStatus('completed');
          
          //show the most recent vote's receipt
          const mostRecentVote = userVotes[userVotes.length - 1];
          setTransactionData(mostRecentVote);
          setShowReceipt(true);
          
          //set the session info from the vote, generate session ID if not present
          setSessionInfo({
            voterId: voterHash || mostRecentVote.voterId,
            sessionId: mostRecentVote.sessionId || `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: mostRecentVote.timestamp || Date.now()
          });
        } else {
          //if the user has not voted - ensure clean state and create a new session ID
          setHasVoted(false);
          setStatusMessage('');
          setVotingStatus('ready');
          
          //generate a new session ID for this voting session
          setSessionInfo({
            voterId: voterHash || user.email,
            sessionId: `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
        setStatusMessage('Error checking vote status. Please try again.');
        
        //even on error, create a session ID
        setSessionInfo({
          voterId: voterHash || user.email,
          sessionId: `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          timestamp: Date.now()
        });
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
    
    if (hasVoted) {
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
      
      //save the vote to localStorage for persistent history
      try {
        //get the existing votes from localStorage
        const savedVotesString = localStorage.getItem('userVotes');
        const savedVotes = savedVotesString ? JSON.parse(savedVotesString) : [];
        
        //add the current timestamp when the vote was saved
        transaction.savedAt = new Date().toISOString();
        
        //add the new vote to the array
        savedVotes.push(transaction);
        
        //save the updated array back to localStorage
        localStorage.setItem('userVotes', JSON.stringify(savedVotes));
        console.log('Vote saved to localStorage for history');
      } catch (storageError) {
        console.error('Failed to save vote to localStorage:', storageError);
      }
      
      //store the session information for display
      setSessionInfo({
        voterId: currentVoterHash,
        sessionId: transaction.sessionId || currentSessionId,
        timestamp: transaction.timestamp || Date.now()
      });
      
      //update the states to reflect the successful vote
      setVotingStatus('completed');
      setSelectedCandidate('');
      setHasVoted(true);
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

  //the front end interface for the voting dashboard
  return (
    <div>
      <BlockchainInfo />
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Cast Your Vote</h2>
        
        {/*status message for the voter to ensure the integrity of their vote*/}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            votingStatus === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
            votingStatus === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            votingStatus === 'processing' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
            'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            <p className="text-center font-medium">{statusMessage}</p>
          </div>
        )}
        
        {/* Only show the "already voted" message if there's no other status message */}
        {hasVoted && !statusMessage && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 text-center">
            You have already cast a vote in this election
          </div>
        )}
        
        {/* Always show session info since we now generate it for all users */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Voting Session Information</h3>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-medium">Session ID: </span>
              <code className="bg-white px-2 py-1 rounded">{sessionInfo?.sessionId || 'Not available'}</code>
            </div>
            <div>
              <span className="font-medium">Voter Hash: </span>
              <code className="bg-white px-2 py-1 rounded">{sessionInfo?.voterId || user?.email || 'Not available'}</code>
            </div>
            <div>
              <span className="font-medium">Session Time: </span>
              <span>{sessionInfo?.timestamp ? new Date(sessionInfo.timestamp).toLocaleString() : new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {candidates.map(candidate => (
            <div 
              key={candidate.id} 
              className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                selectedCandidate === candidate.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-200'
              } ${hasVoted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !hasVoted && setSelectedCandidate(candidate.id)}
            >
              <h3 className="text-xl font-semibold mb-2">{candidate.name}</h3>
              <p className="text-indigo-600 font-medium mb-3">{candidate.party}</p>
              <p className="text-gray-600 mb-4">{candidate.description}</p>
              <div className="flex items-center">
                <input 
                  type="radio"
                  name="candidate"
                  value={candidate.id}
                  checked={selectedCandidate === candidate.id}
                  onChange={() => !hasVoted && setSelectedCandidate(candidate.id)}
                  disabled={hasVoted}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="ml-2 text-gray-700">Select</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center">
          <button 
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              hasVoted || votingStatus === 'processing' || !selectedCandidate
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            onClick={handleVote}
            disabled={hasVoted || votingStatus === 'processing' || !selectedCandidate}
          >
            {votingStatus === 'processing' ? 'Processing...' : 
             hasVoted ? 'Vote Submitted' : 'Submit Vote'}
          </button>
        </div>

        {showReceipt && transactionData && (
          <div className="mt-8 p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-lg">
            <VoteReceipt transactionData={transactionData} />
          </div>
        )}
      </div>
    </div>
  )
}