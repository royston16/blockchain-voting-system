import { useState, useEffect } from 'react';

//method to display the vote receipt for the voter to ensure the integrity of their vote
//with the ability to download the receipt as a text file
export default function VoteReceipt({ transactionData }) {
  const [showDetails, setShowDetails] = useState(false);
  const [localTransactionData, setLocalTransactionData] = useState({});
  
  //generate placeholder values for missing data
  useEffect(() => {
    if (!transactionData) {
      console.error('No transaction data provided to VoteReceipt');
      return;
    }
    
    //create a copy of the transaction data
    const enhancedData = { ...transactionData };
    
    //generate a random session ID if not available
    if (!enhancedData.sessionId) {
      enhancedData.sessionId = `local-session-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      console.log('Generated placeholder session ID:', enhancedData.sessionId);
    }
    
    //generate a random transaction ID if not available
    if (!enhancedData.txId) {
      enhancedData.txId = `local-tx-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      console.log('Generated placeholder transaction ID:', enhancedData.txId);
    }
    
    //ensure the timestamp exists
    if (!enhancedData.timestamp) {
      enhancedData.timestamp = Date.now();
    }
    
    //set the enhanced data
    setLocalTransactionData(enhancedData);
  }, [transactionData]);
  
  if (!transactionData || Object.keys(localTransactionData).length === 0) {
    return <div className="text-center py-4">Loading receipt data...</div>;
  }
  
  //method to download the vote receipt as a text file
  const downloadReceipt = () => {
    const electionName = localTransactionData.electionName || "Blockchain Voting Election";
    const hasBlockchainConfirmation = !!(localTransactionData.transactionId && localTransactionData.blockHash);
    
    //determine the blockchain status message based on available data
    let blockchainStatusMessage;
    if (hasBlockchainConfirmation) {
      blockchainStatusMessage = `This vote has been immutably recorded on the Ethereum blockchain.
                                  Your vote cannot be altered or deleted.
                                  This receipt serves as proof of your participation in the election.`;
    } else {
      blockchainStatusMessage = `This vote has been recorded in the system.
                                  The transaction is pending blockchain confirmation.
                                  Please check back later for full blockchain verification details.`;
    }
    
    //format the candidate information correctly
    const candidateInfo = formatCandidateInfo(localTransactionData);
    
    const receiptContent = `
BLOCKCHAIN VOTING RECEIPT
=========================
Date: ${new Date(localTransactionData.timestamp).toLocaleString()}

VOTE INFORMATION
---------------
Election: ${electionName}
Your Vote: ${candidateInfo}
Vote Time: ${new Date(localTransactionData.timestamp).toLocaleString()}
${localTransactionData.voteTimestamp ? `Vote Initiated: ${new Date(localTransactionData.voteTimestamp).toLocaleString()}` : ''}

VOTER VERIFICATION
----------------
Voter Hash: ${localTransactionData.voterId}
Your email has been securely hashed to protect your privacy while maintaining vote verification.

BLOCKCHAIN DETAILS
----------------
Transaction ID: ${localTransactionData.transactionId || "Pending"}
Block Number: ${localTransactionData.blockNumber || "Pending"}
Block Hash: ${localTransactionData.blockHash || "Pending"}
Transaction Status: ${hasBlockchainConfirmation ? "Confirmed" : "Pending confirmation"}

RECEIPT VERIFICATION
------------------
${blockchainStatusMessage}

Receipt generated on: ${new Date().toLocaleString()}
    `;

    //create a downloadable text file with the receipt content
    const element = document.createElement('a');
    const file = new Blob([receiptContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `voting-receipt-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  //format the candidate information for display
  const formatCandidateInfo = (data) => {
    //check for different possible field names that might contain candidate info
    const candidateValue = data.candidate || data.candidateId || "Not recorded";
    
    //if it's A, B, C format, display as Candidate A, etc.
    if (typeof candidateValue === 'string' && /^[A-Z]$/.test(candidateValue)) {
      return `Candidate ${candidateValue}`;
    }
    
    //if it is something like "Candidate X" already, return as is
    if (typeof candidateValue === 'string' && candidateValue.startsWith('Candidate ')) {
      return candidateValue;
    }
    
    //otherwise, format with "Candidate" prefix if it's not already formatted
    return typeof candidateValue === 'string' ? `Candidate ${candidateValue}` : "Not recorded";
  };
  
  //method to format the ID for display for different ID types on the receipt
  const formatId = (id, type = 'tx') => {
    if (!id) return 'N/A';
    if (id.length <= 16) return id;
    
    //different formatting for different ID types
    if (type === 'voter') {
      //for voter emails, show the first part before @ or truncate
      if (id.includes('@')) {
        return id.substring(0, id.indexOf('@')) + '...';
      }
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
  
  //determine if the receipt is using any generated IDs
  const isUsingGeneratedIds = !transactionData.txId || !transactionData.sessionId;
  
  //determine if the receipt has blockchain confirmation
  const hasBlockchainConfirmation = !!(localTransactionData.transactionId && localTransactionData.blockHash);
  
  //get the formatted candidate information
  const candidateInfo = formatCandidateInfo(localTransactionData);
  
  //front end display of the vote receipt using HTML
  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold mb-4">Vote Receipt</h3>
      <div className={`mb-6 p-4 ${hasBlockchainConfirmation ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'} rounded-lg`}>
        <div className="flex items-center justify-center mb-4">
          {hasBlockchainConfirmation ? (
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <p className="text-lg mb-2">
          {hasBlockchainConfirmation 
            ? "Your vote has been securely recorded on the blockchain." 
            : "Your vote has been recorded and is pending blockchain confirmation."}
        </p>
        <p className="text-sm text-gray-600">Keep this receipt for your records.</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Voting Session Information Section */}
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-700">Voting Session Information</h4>
            
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Session ID:</div>
                <div className="font-mono text-base bg-white p-2 rounded border break-all">
                  {localTransactionData.sessionId}
                  {!transactionData.sessionId && (
                    <span className="ml-2 text-xs text-indigo-500">(Generated)</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Voter Hash:</div>
                <div className="font-mono text-base bg-white p-2 rounded border break-all">
                  {localTransactionData.voterId || "Not available"}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your email has been securely hashed for privacy protection
                </p>
              </div>
              
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Your Vote:</div>
                <div className="text-base font-medium bg-white p-2 rounded border">
                  {candidateInfo}
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Vote Time:</div>
                <div className="text-base">
                  {new Date(localTransactionData.timestamp).toLocaleString()}
                </div>
                {localTransactionData.voteTimestamp && localTransactionData.voteTimestamp !== localTransactionData.timestamp && (
                  <p className="mt-1 text-xs text-gray-500">
                    Vote initiated at: {new Date(localTransactionData.voteTimestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Transaction ID Section - Always show, but with "Not available" if missing */}
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-700">Transaction ID</h4>
            <div className="font-mono text-base bg-white p-2 mt-2 rounded border">
              {formatId(localTransactionData.txId)}
              {!transactionData.txId && (
                <span className="ml-2 text-xs text-indigo-500">(Generated)</span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This is your unique vote transaction identifier
            </p>
          </div>
          
          {isUsingGeneratedIds && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
              <svg className="inline-block w-4 h-4 mr-1 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Some identifiers have been generated locally since they were not available from the blockchain.
            </div>
          )}
          
          <button 
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        </div>
        
        {showDetails && (
          <div className="space-y-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Transaction Details</h3>
            
            {localTransactionData.transactionId && (
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Transaction ID:</div>
                <div className="font-mono text-xs bg-white p-2 rounded border break-all">
                  {localTransactionData.transactionId}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This unique identifier is stored on the blockchain
                </p>
              </div>
            )}
            
            {localTransactionData.blockHash && (
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Block Hash:</div>
                <div className="font-mono text-xs bg-white p-2 rounded border break-all">
                  {localTransactionData.blockHash}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Cryptographic hash of the block containing your vote
                </p>
              </div>
            )}
            
            {localTransactionData.blockNumber && (
              <div className="flex flex-col">
                <div className="text-sm font-medium text-gray-600">Block Number:</div>
                <div className="font-mono text-sm bg-white p-2 rounded border">
                  {localTransactionData.blockNumber}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The block position in the blockchain
                </p>
              </div>
            )}
            
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-600">Vote Verification:</div>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">
                  {hasBlockchainConfirmation 
                    ? "Your vote has been cryptographically recorded on the Ethereum blockchain. This ensures your vote cannot be altered or deleted."
                    : "Your vote is being processed for inclusion in the Ethereum blockchain. Once confirmed, it cannot be altered or deleted."}
                </p>
                <p className="text-sm mt-2">
                  {hasBlockchainConfirmation
                    ? "The transaction's immutability is guaranteed by blockchain technology."
                    : "Full blockchain verification will be available once the transaction is confirmed."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <button 
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center w-full"
        onClick={downloadReceipt}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Receipt
      </button>
    </div>
  );
} 