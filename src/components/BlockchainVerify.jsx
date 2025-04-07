import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'
import blockchainService from '../blockchain/fabric-gateway'

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

  useEffect(() => {
    async function verifyBlockchain() {
      setLoadingMessage("Loading... Chain is checking validation");
      
      try {
        //initialize the blockchain
        await blockchainService.initialize();
        
        //get all the votes from the blockchain
        const votesData = await blockchainService.getAllVotes();
        
        //add the previous hash references (genesis block or previous block in the chain)
        const votesWithHashes = votesData.map((vote, index) => ({
          ...vote,
          previousHash: index > 0 ? votesData[index - 1].txId : "Genesis block"
        }));
        
        setVotes(votesWithHashes);
        
        //verify the chain
        const status = await blockchainService.verifyChain();
        setChainStatus(status);
        setValidation(status.isValid);
        
        setLoadingMessage("Validation complete. See results below.");
        setShowChainData(true);
      } catch (error) {
        console.error('Error verifying blockchain:', error);
        setLoadingMessage("Error validating blockchain. Please try again.");
        setValidation(false);
      } finally {
        setLoading(false);
      }
    }
    
    verifyBlockchain();
  }, []);

  const loadMoreBlocks = () => {
    setDisplayedBlocks(prev => Math.min(prev + 10, votes.length));
  };

  const truncateHash = (hash) => {
    if (!hash) return '';
    return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  };

  let loadingStatus = loading ? (
    <div>
      <p>Loading... Chain is checking validation</p>
    </div>
  ) : (
    <div>
      <p>{loadingMessage}</p>
    </div>
  );

  let chainData;
  if (votes.length === 0) {
    chainData = (
      <span>No votes cast so chain not established</span>
    );
  } else if (showChainData) {
    chainData = (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="text-2xl font-bold">
            Number of Blocks: {chainStatus?.blockCount || votes.length}
          </div>
          <div className="text-sm text-gray-500">
            Click on a block to view details
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto pr-4">
          {votes.slice(0, displayedBlocks).map((vote, i) => (
            <div 
              key={i} 
              className={`mb-4 bg-white rounded-lg shadow-md transition-all duration-200 ${
                expandedBlock === i ? 'ring-2 ring-indigo-500' : 'hover:shadow-lg cursor-pointer'
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
                          <div>Vote Cast: Candidate {vote.candidate}</div>
                          <div>Timestamp: {new Date(vote.timestamp).toLocaleString()}</div>
                          <div>Block Number: {i + 1}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {displayedBlocks < votes.length && (
          <button
            onClick={loadMoreBlocks}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
          >
            Load More Blocks
          </button>
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
    <div>
      <BlockchainInfo />
      <div className="card">
        {loadingStatus}
      </div>
      <div className="card">
        {chainData}
        <div className="mt-6">
          <span className="font-semibold">Validation Status: </span>
          {validationDiv}
        </div>
      </div>
    </div>
  );
}