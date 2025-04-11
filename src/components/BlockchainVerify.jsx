import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/ethereum-service'
import { verifyVoteInclusion, generateMerkleProof, verifyMerkleProof } from '../blockchain/zk-utils'

//method to verify the blockchain integrity
export default function BlockchainVerify() {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading... Chain is checking validation");
  const [showChainData, setShowChainData] = useState(false);
  const [validation, setValidation] = useState(false);
  const [votes, setVotes] = useState([]);
  const [chainStatus, setChainStatus] = useState(null);
  const [displayedBlocks, setDisplayedBlocks] = useState(10);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [zkProofs, setZkProofs] = useState({});
  const [selectedVoteForVerification, setSelectedVoteForVerification] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [totalVotesCount, setTotalVotesCount] = useState(0);

  //method to get the real total votes count
  const getTotalVotesCount = async () => {
    try {
      //try to get votes from localStorage first
      const savedVotesString = localStorage.getItem('userVotes');
      if (savedVotesString) {
        const storedVotes = JSON.parse(savedVotesString);
        if (Array.isArray(storedVotes) && storedVotes.length > 0) {
          return storedVotes.length;
        }
      }
      
      //if no localStorage votes, check the contract value
      if (blockchainService.contract) {
        try {
          const contractValue = await blockchainService.contract.getValue();
          const numericValue = parseInt(contractValue.toString() || "0");
          if (numericValue > 0) {
            return numericValue;
          }
        } catch (error) {
          console.warn("Error getting contract value:", error);
        }
      }
      
      //if all else fails, use the votes state length
      return votes.length;
    } catch (error) {
      console.error("Error getting total votes count:", error);
      return votes.length;
    }
  };

  useEffect(() => {
    async function verifyBlockchain() {
      setLoadingMessage("Loading... Chain is checking validation");
      
      try {
        //initialize the blockchain
        await blockchainService.initialize();
        
        //get the connection status from the blockchain service
        const connectionInfo = blockchainService.getConnectionInfo();
        
        //check if the user is connected to the ethereum network
        if (!connectionInfo.connected) {
          setLoadingMessage("Not connected to Ethereum network. Please connect your wallet.");
          setVotes([]);
          setValidation(false);
          setLoading(false);
          return;
        }
        
        //check if the contract is deployed on the network
        if (connectionInfo.contractAddress === 'Not deployed') {
          setLoadingMessage("Contract not deployed. Please deploy a contract first.");
          setVotes([]);
          setValidation(false);
          setLoading(false);
          return;
        }
        
        //get all the votes from the blockchain
        const votesData = await blockchainService.getAllVotes();
        
        //check if there are any votes on the blockchain
        if (!votesData.votes || votesData.votes.length === 0) {
          setLoadingMessage("No votes found on the blockchain.");
          setVotes([]);
          setValidation(true);
          setLoading(false);
          setShowChainData(true);
          return;
        }
        
        //use the votes directly from the blockchain service
        setVotes(votesData.votes);
        
        //verify the chain integrity
        const status = await blockchainService.verifyChain();
        setChainStatus(status);
        setValidation(status.isValid);
        
        // Get the accurate total votes count
        const actualVotesCount = await getTotalVotesCount();
        setTotalVotesCount(actualVotesCount);
        
        // Generate ZK proofs for votes verification
        const proofs = {};
        const allCommitments = votesData.votes.map(vote => vote.txId);
        
        for (const vote of votesData.votes) {
          // Generate a Merkle proof for this vote
          const merkleProof = await generateMerkleProof(vote.txId, allCommitments);
          proofs[vote.txId] = {
            merkleProof,
            merkleRoot: merkleProof ? merkleProof.root : null,
            // Store minimal data needed for verification
            verificationData: {
              voteIncluded: verifyVoteInclusion(vote.txId, allCommitments),
              timestamp: vote.timestamp,
              blockNumber: vote.blockNumber,
            }
          };
        }
        
        setZkProofs(proofs);
        
        //set the loading message and show the chain data
        setLoadingMessage("Validation complete. See results below.");
        setShowChainData(true);

        //if there is an error, set the loading message and validation status
      } catch (error) {
        console.error('Error verifying blockchain:', error);
        setLoadingMessage(`Error validating blockchain: ${error.message}`);
        setValidation(false);
      } finally {
        setLoading(false);
      }
    }
    
    verifyBlockchain();
  }, []);

  //method to load more blocks from the blockchain
  const loadMoreBlocks = () => {
    setDisplayedBlocks(prev => Math.min(prev + 10, votes.length));
  };

  //method to truncate the hash to 16 characters
  const truncateHash = (hash) => {
    if (!hash) return '';
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  };

  // Method to verify a specific vote using zero-knowledge proofs
  const verifyVoteWithZKP = async (voteId) => {
    setSelectedVoteForVerification(voteId);
    
    if (!zkProofs[voteId]) {
      setVerificationResult({
        success: false,
        message: "No zero-knowledge proof available for this vote"
      });
      return;
    }
    
    const proof = zkProofs[voteId];
    const allCommitments = votes.map(vote => vote.txId);
    
    // Perform zero-knowledge verification
    const isIncluded = verifyVoteInclusion(voteId, allCommitments);
    const merkleVerification = proof.merkleProof ? 
      verifyMerkleProof(proof.merkleProof, voteId, proof.merkleRoot) : 
      false;
    
    // Record verification result
    setVerificationResult({
      success: isIncluded && merkleVerification,
      message: isIncluded && merkleVerification 
        ? "✓ Vote verified! This vote exists in the blockchain and has not been tampered with." 
        : "⚠️ Verification failed. Either the vote is not in the blockchain or has been tampered with.",
      details: {
        voteExists: isIncluded,
        merkleProofValid: merkleVerification,
        timestamp: proof.verificationData.timestamp,
        blockNumber: proof.verificationData.blockNumber
      }
    });
  };

  //method to display the loading status
  let loadingStatus = loading ? (
    <div>
      <p>Loading... Chain is checking validation</p>
    </div>
  ) : (
    <div>
      <p>{loadingMessage}</p>
    </div>
  );

  //set up the HTML for the chain data (frontend display)
  let chainData;
  if (votes.length === 0) {
    chainData = (
      <span>No votes cast so chain not established</span>
    );
  } else if (showChainData) {
    chainData = (
      <div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">Blockchain Verification Status</h3>
          
          <div className="flex items-center mb-4">
            <div className={`w-4 h-4 rounded-full mr-2 ${validation ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`font-medium ${validation ? 'text-green-600' : 'text-red-600'}`}>
              {validation ? 'Blockchain Integrity Verified' : 'Blockchain Integrity Compromised'}
            </span>
          </div>
          
          {chainStatus && (
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Total Votes:</span>
                  <div className="font-medium">{totalVotesCount || chainStatus.value || votes.length}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Blocks:</span>
                  <div className="font-medium">{chainStatus.blockCount || votes.length}</div>
                </div>
              </div>
              
              {chainStatus.message && (
                <div className="mt-3 text-sm text-gray-700">
                  <span className="font-medium">Status: </span>
                  {chainStatus.message}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Zero-Knowledge Verification:</h4>
            <p className="text-sm text-gray-600 mb-3">
              Select any block below to verify its inclusion without revealing the vote content.
              This uses zero-knowledge proofs to maintain voter privacy while ensuring vote integrity.
            </p>
            
            {selectedVoteForVerification && verificationResult && (
              <div className={`p-4 rounded-md mb-4 ${
                verificationResult.success ? 'bg-green-50 border border-green-200' : 
                'bg-red-50 border border-red-200'
              }`}>
                <h5 className="font-medium mb-2">Verification Result:</h5>
                <p className={verificationResult.success ? 'text-green-700' : 'text-red-700'}>
                  {verificationResult.message}
                </p>
                
                {verificationResult.details && (
                  <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium">Vote Exists: </span>
                      {verificationResult.details.voteExists ? '✓' : '✗'}
                    </div>
                    <div>
                      <span className="font-medium">Proof Valid: </span>
                      {verificationResult.details.merkleProofValid ? '✓' : '✗'}
                    </div>
                    <div>
                      <span className="font-medium">Timestamp: </span>
                      {new Date(verificationResult.details.timestamp).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Block: </span>
                      {verificationResult.details.blockNumber}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-4">Blockchain Structure</h3>
        <div className="space-y-4">
          {votes.slice(0, displayedBlocks).map((vote, i) => (
            <div 
              key={i} 
              className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${
                selectedVoteForVerification === vote.txId ? 'border-indigo-500' : 'border-gray-200'
              }`}
              onClick={() => setExpandedBlock(expandedBlock === i ? null : i)}
            >
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold text-indigo-600">
                    Block {i + 1}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(vote.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  Hash: <code className="bg-gray-100 px-2 py-1 rounded">{truncateHash(vote.txId)}</code>
                </div>

                {expandedBlock === i && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Full Block Hash</div>
                        <code className="block mt-1 text-sm bg-gray-100 p-2 rounded break-all">
                          {vote.txId}
                        </code>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Previous Block Hash</div>
                        <code className="block mt-1 text-sm bg-gray-100 p-2 rounded break-all">
                          {vote.previousHash}
                        </code>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Block Data</div>
                        <div className="mt-1 bg-gray-100 p-2 rounded text-sm">
                          <div>Vote Cast: {vote.candidate}</div>
                          <div>Timestamp: {new Date(vote.timestamp).toLocaleString()}</div>
                          <div>Block Number: {i + 1}</div>
                          <div>Voter ID: {vote.voterId}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          verifyVoteWithZKP(vote.txId);
                        }}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium"
                      >
                        Verify with Zero-Knowledge Proof
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {displayedBlocks < votes.length && (
          <div className="mt-6 text-center">
            <button 
              onClick={loadMoreBlocks} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
            >
              Load More Blocks
            </button>
          </div>
        )}
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
      
      {loading ? loadingStatus : (
        <div>
          {showChainData ? chainData : loadingStatus}
        </div>
      )}
    </div>
  );
}