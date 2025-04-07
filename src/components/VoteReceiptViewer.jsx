import { useState, useEffect } from 'react';
import blockchainService from '../blockchain/fabric-gateway';
import VoteReceipt from './VoteReceipt';

//method to display the viewer for the vote receipts
//directly on the front end interface
export default function VoteReceiptViewer({ user }) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVote, setSelectedVote] = useState(null);

  useEffect(() => {
    async function fetchVotes() {
      try {
        console.log('Fetching votes for user:', user.email);
        await blockchainService.initialize();
        const allVotes = await blockchainService.getAllVotes();
        
        //filter the votes for the current user using the improved matching logic
        const userVotes = allVotes.filter(vote => {
          //match the votes based on either:
          //1. original voter email (most reliable)
          //2. voter ID contains part of the email
          return (
            (vote.originalVoter && vote.originalVoter === user.email) ||
            (vote.voterId && vote.voterId.includes(user.email))
          );
        });
        
        console.log('Found votes for user:', userVotes.length);
        setVotes(userVotes);
      } catch (error) {
        console.error('Error fetching votes:', error);
        setError('Failed to load your voting history. ' + error.message);
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

  if (error) {
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
            <div className="grid gap-4">
              {votes.map((vote) => (
                <div
                  key={vote.txId}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedVote?.txId === vote.txId
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200 hover:border-indigo-200'
                  }`}
                  onClick={() => setSelectedVote(vote)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Vote for Candidate {vote.candidate}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(vote.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
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

          {selectedVote && (
            <div className="mt-6 p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-lg">
              <VoteReceipt transactionData={selectedVote} />
            </div>
          )}
        </div>
      )}
    </div>
  );
} 