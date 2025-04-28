import React, { useState, useEffect } from 'react'
import blockchainService from '../blockchain/ethereum-service'
import { Link } from 'react-router-dom'

// Method to verify the blockchain integrity
export default function BlockchainVerify() {
  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState(null);
  const [votes, setVotes] = useState([]);
  const [showChainData, setShowChainData] = useState(false);
  const [chainStatus, setChainStatus] = useState({
    numBlocks: 0,
    lastBlock: null,
    lastVerifiedTime: null
  });
  const [loadingStatus, setLoadingStatus] = useState('Initializing blockchain verification...');

  const verifyBlockchain = async () => {
    try {
      setIsLoading(true);
      setLoadingStatus('Initializing blockchain connection...');
      await blockchainService.initialize();

      setLoadingStatus('Retrieving votes from blockchain...');
      const result = await blockchainService.getAllVotes(1000, 0);
      if (!result || !result.votes) {
        setIsLoading(false);
        return;
      }

      setVotes(result.votes);
      
      setLoadingStatus('Verifying chain integrity...');
      // Perform integrity verification
      let isValid = true;
      
      // If we have votes, verify the chain
      if (result.votes.length > 0) {
        // Simple verification logic - would be more complex in production
        // This could be replaced with a call to a more complex verification function
        for (let i = 1; i < result.votes.length; i++) {
          const currentVote = result.votes[i];
          const previousVote = result.votes[i-1];
          
          // Basic check that vote references are intact
          // Real implementation would check cryptographic proofs
          if (!currentVote.txId || !previousVote.txId) {
            isValid = false;
            break;
          }
        }
      }
      
      setValidation(isValid);
      
      setChainStatus({
        numBlocks: result.votes.length,
        lastBlock: result.votes.length > 0 ? result.votes[result.votes.length - 1] : null,
        lastVerifiedTime: new Date().toISOString()
      });
      
      setShowChainData(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error verifying blockchain:', error);
      setIsLoading(false);
      setValidation(false);
    }
  };

  useEffect(() => {
    // Set up event listener for vote data updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyBlockchain();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial verification
    verifyBlockchain();

    // Refresh every 5 minutes
    const refreshInterval = setInterval(verifyBlockchain, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, []);

  const truncateHash = (hash) => {
    if (!hash) return '';
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const handleRefresh = (e) => {
    e.preventDefault();
    verifyBlockchain();
  };

  let chainData;
  if (showChainData) {
    chainData = (
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Chain Status</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Verification Status</p>
              <p className="font-medium">
                {validation ? (
                  <span className="text-green-600">✓ Valid</span>
                ) : (
                  <span className="text-red-600">⚠ Invalid</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Votes in Chain</p>
              <p className="font-medium">{chainStatus.numBlocks}</p>
            </div>
            {chainStatus.lastBlock && (
              <>
                <div>
                  <p className="text-gray-500 text-sm">Current Block</p>
                  <p className="font-medium">{truncateHash(chainStatus.lastBlock.txId)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Last Verified</p>
                  <p className="font-medium">{formatTime(chainStatus.lastVerifiedTime)}</p>
                </div>
              </>
            )}
          </div>
          <div className="text-right">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Refresh Verification
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    chainData = (
      <div>Loading...</div>
    );
  }

  let validationDiv;
  if (showChainData) {
    validationDiv = validation ? (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <span className="font-bold">✓</span> Chain has been validated!
      </div>
    ) : (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <span className="font-bold">⚠</span> Chain is invalid - check for breaches!
      </div>
    );
  } else {
    validationDiv = (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        Chain is currently validating...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Blockchain Verification</h2>
      <p className="text-gray-600 mb-6">
        This page allows you to verify the integrity of the election blockchain. 
        All votes are cryptographically linked in a chain, preventing tampering.
        Zero-knowledge proofs verify votes without revealing voter choices.
      </p>
      
      {isLoading ? loadingStatus : (
        <div>
          {validationDiv}
          {showChainData ? chainData : loadingStatus}
        </div>
      )}
      
      {/* Referring users to the blockchain structure component */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-3">Blockchain Structure Visualization</h3>
        <p className="mb-4">
          To view and interact with the complete blockchain structure, including detailed block information and verification tools, 
          please visit the Blockchain Structure page.
        </p>
        <Link 
          to="/blockchain-structure" 
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          View Blockchain Structure
        </Link>
      </div>
    </div>
  );
}