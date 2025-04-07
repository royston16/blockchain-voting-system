import { useState, useEffect } from 'react'
import blockchainService from '../blockchain/fabric-gateway'

//method to display the blockchain information
export default function BlockchainInfo() {
  const [blockInfo, setBlockInfo] = useState({
    currentBlock: 0,
    totalVotes: 0,
    lastUpdate: new Date().toISOString(),
    networkStatus: 'Connecting...',
    chainStatus: 'Validating...'
  })

  //method to update the blockchain information
  useEffect(() => {
    const updateBlockchainInfo = async () => {
      try {
        await blockchainService.initialize();
        const votes = await blockchainService.getAllVotes();
        const chainStatus = await blockchainService.verifyChain();
        
        //update the blockchain information with the new values
        setBlockInfo(prev => ({
          currentBlock: votes.length + 1, //next block number
          totalVotes: votes.length,
          lastUpdate: new Date().toISOString(),
          networkStatus: 'Connected',
          chainStatus: chainStatus.isValid ? 'Verified' : 'Invalid'
        }));
      } catch (error) {
        console.error('Error updating blockchain info:', error);
        setBlockInfo(prev => ({
          ...prev,
          networkStatus: 'Error',
          chainStatus: 'Unknown'
        }));
      }
    };

    //initial update of the blockchain information
    updateBlockchainInfo();

    //set up periodic updates (every 5 seconds)
    const interval = setInterval(updateBlockchainInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  //front end display of the blockchain information
  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Blockchain Network Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Next Block</div>
          <div className="text-2xl font-bold text-indigo-600">{blockInfo.currentBlock}</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Votes</div>
          <div className="text-2xl font-bold text-indigo-600">{blockInfo.totalVotes}</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Network Status</div>
          <div className={`text-2xl font-bold ${
            blockInfo.networkStatus === 'Connected' ? 'text-green-600' : 
            blockInfo.networkStatus === 'Error' ? 'text-red-600' : 
            'text-yellow-600'
          }`}>
            {blockInfo.networkStatus}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Last Update</div>
          <div className="text-xl font-bold text-indigo-600">
            {new Date(blockInfo.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Chain Status</div>
          <div className={`text-2xl font-bold ${
            blockInfo.chainStatus === 'Verified' ? 'text-green-600' : 
            blockInfo.chainStatus === 'Invalid' ? 'text-red-600' : 
            'text-yellow-600'
          }`}>
            {blockInfo.chainStatus}
          </div>
        </div>
      </div>
    </div>
  )
} 