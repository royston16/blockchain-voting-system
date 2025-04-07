import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/fabric-gateway'
import VoteReceipt from './VoteReceipt'

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
    }
    
    setPreviousUser(user);
  }, [user, previousUser]);

  //initialize the blockchain service and check the vote status when the component mounts
  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        await blockchainService.initialize();
        const allVotes = await blockchainService.getAllVotes();
        
        //check for existing votes by this user
        const userVotes = allVotes.filter(vote => {
          
          //check if this email has already voted by checking some property in the vote
          //in a real system, this would be more secure
          return vote.voterId.includes(user.email) || (vote.originalVoter && vote.originalVoter === user.email);
        });
        
        if (userVotes.length > 0) {
          setHasVoted(true);
          setStatusMessage('You have already cast your vote.');
          setVotingStatus('completed');
          
          //show the most recent vote's receipt
          const mostRecentVote = userVotes[userVotes.length - 1];
          setTransactionData(mostRecentVote);
          setShowReceipt(true);
          
          //set the session info from the vote
          setSessionInfo({
            voterId: mostRecentVote.voterId,
            sessionId: mostRecentVote.sessionId,
            timestamp: mostRecentVote.timestamp
          });
        } else {
          //if user has not voted - ensure clean state
          setHasVoted(false);
          setStatusMessage('');
          setVotingStatus('ready');
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
        setStatusMessage('Error checking vote status. Please try again.');
      }
    };
    
    //check the vote status if the user is logged in
    if (user && user.email) {
      checkVoteStatus();
    }
  }, [user]);

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
    
    setStatusMessage('Submitting your vote...');
    setVotingStatus('processing');
    
    try {
      console.log('Starting vote submission for user:', user.email);
      
      //cast vote using the blockchain service - pass email for identification
      const result = await blockchainService.castVote(user.email, selectedCandidate);
      console.log('Vote cast successful, result:', result);
      
      //add the original voter email to the result for easier lookups
      result.originalVoter = user.email;
      
      //update the transaction data and show the receipt
      setTransactionData(result);
      setShowReceipt(true);
      
      //store the session information for display
      setSessionInfo({
        voterId: result.voterId,
        sessionId: result.sessionId,
        timestamp: result.timestamp
      });
      
      //update the states to reflect the successful vote
      setVotingStatus('completed');
      setSelectedCandidate('');
      setHasVoted(true);
      setStatusMessage('Your vote has been successfully recorded on the blockchain!');
      
    } catch (error) {
      console.error('Error casting vote:', error);
      setVotingStatus('error');
      setStatusMessage(error.message || 'An error occurred while submitting your vote');
    }
  }

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
        
        {/*session info for the voter to ensure the integrity of their vote*/}
        {sessionInfo && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Voting Session Information</h3>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">Session ID: </span>
                <code className="bg-white px-2 py-1 rounded">{sessionInfo.sessionId || 'Not available'}</code>
              </div>
              <div>
                <span className="font-medium">Voter Hash: </span>
                <code className="bg-white px-2 py-1 rounded">{sessionInfo.voterId || 'Not available'}</code>
              </div>
              <div>
                <span className="font-medium">Session Time: </span>
                <span>{sessionInfo.timestamp ? new Date(sessionInfo.timestamp).toLocaleString() : 'Not available'}</span>
              </div>
            </div>
          </div>
        )}
        
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