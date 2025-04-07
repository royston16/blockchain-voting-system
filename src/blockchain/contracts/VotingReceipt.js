//voting receipt for the application to verify the vote

import { useState } from 'react';

//voting receipt component to verify the vote by the user
export default function VoteReceipt({ transactionData }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const downloadReceipt = () => {
    const receiptContent = `
VOTE RECEIPT
====================
Transaction ID: ${transactionData.txId}
Time of Vote: ${transactionData.timestamp}
Candidate: ${transactionData.candidate}
Block Number: ${transactionData.blockNumber}
====================
This receipt proves your vote was recorded on the blockchain.
The integrity of your vote can be verified using the transaction ID.
    `;
    
    //create and download the file with the receipt content
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
  
  //return the voting receipt component with the details of the vote
  return (
    <div className="vote-receipt-container">
      <h3>Vote Confirmation</h3>
      <p>Your vote has been securely recorded on the blockchain.</p>
      
      <div className="receipt-summary">
        <p>Transaction ID: <code>{transactionData.txId.substring(0, 12)}...</code></p>
        <p>Time: {new Date(transactionData.timestamp).toLocaleString()}</p>
        <button className="link-button" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {showDetails && (
        <div className="receipt-details">
          <p>Block Number: {transactionData.blockNumber}</p>
          <p>Candidate: {transactionData.candidate}</p>
          <p>Voter ID (hashed): {transactionData.voterHash}</p>
        </div>
      )}
      
      <button className="button" onClick={downloadReceipt}>
        Download Receipt
      </button>
    </div>
  );
}
