import { useState } from 'react';

export default function VoteReceipt({ transactionData }) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!transactionData) {
    console.error('No transaction data provided to VoteReceipt');
    return null;
  }
  
  const downloadReceipt = () => {
    const receiptContent = `
VOTE RECEIPT
====================
Transaction ID: ${transactionData.txId}
Time of Vote: ${transactionData.timestamp}
Candidate: ${transactionData.candidate}
Block Number: ${transactionData.blockNumber}
Voter Hash: ${transactionData.voterId || 'Not available'}
Session ID: ${transactionData.sessionId || 'Not available'}
====================
This receipt proves your vote was recorded on the blockchain.
The integrity of your vote can be verified using the transaction ID.
Your vote is anonymous and can only be traced using your voter hash.
Your voting session is uniquely identified by the session ID.
    `;
    
    // Create and download file
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote-receipt-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const formatId = (id, type = 'tx') => {
    if (!id) return 'N/A';
    if (id.length <= 16) return id;
    
    // Different formatting for different ID types
    if (type === 'voter') {
      // For voter hashes, show first 6 and last 4 characters
      return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
    } else if (type === 'session') {
      // For session IDs, show first 8 characters
      return `${id.substring(0, 8)}...`;
    } else {
      // For transaction IDs, show first 8 and last 8 characters
      return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
    }
  };
  
  console.log('Rendering VoteReceipt with data:', transactionData);
  
  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold mb-4">Vote Receipt</h3>
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-lg mb-2">Your vote has been securely recorded on the blockchain.</p>
        <p className="text-sm text-gray-600">Keep this receipt for your records.</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Transaction ID</label>
            <code className="block mt-1 text-lg bg-white p-2 rounded border">
              {formatId(transactionData.txId)}
            </code>
            <p className="mt-1 text-xs text-gray-500">
              This is your unique vote transaction identifier
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Session ID</label>
            <code className="block mt-1 text-lg bg-white p-2 rounded border">
              {formatId(transactionData.sessionId, 'session')}
            </code>
            <p className="mt-1 text-xs text-gray-500">
              Your unique voting session identifier
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Voter Hash</label>
            <code className="block mt-1 text-sm bg-white p-2 rounded border break-all">
              {formatId(transactionData.voterId, 'voter')}
            </code>
            <p className="mt-1 text-xs text-gray-500">
              Your anonymized voter ID on the blockchain
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Time of Vote</label>
            <div className="mt-1 text-lg">{new Date(transactionData.timestamp).toLocaleString()}</div>
          </div>
          
          <button 
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>
        </div>
        
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Block Number</label>
                <div className="mt-1">{transactionData.blockNumber}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Candidate</label>
                <div className="mt-1">Candidate {transactionData.candidate}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Full Transaction ID</label>
                <code className="block mt-1 text-sm bg-white p-2 rounded border break-all">
                  {transactionData.txId}
                </code>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600">Full Session ID</label>
                <code className="block mt-1 text-sm bg-white p-2 rounded border break-all">
                  {transactionData.sessionId}
                </code>
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