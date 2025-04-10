import { useState, useEffect } from 'react'
import blockchainService from '../blockchain/ethereum-service'

//method to display the blockchain information
export default function BlockchainInfo() {
  const [blockInfo, setBlockInfo] = useState({
    currentBlock: 0,
    totalVotes: 0,
    lastUpdate: new Date().toISOString(),
    networkStatus: 'Connecting...',
    chainStatus: 'Validating...',
    contractDeployed: false
  })

  //method to update the blockchain information
  useEffect(() => {
    const updateBlockchainInfo = async () => {
      try {
        //initialize the blockchain service if needed
        await blockchainService.initialize();
        
        //get the connection info to check if the user is connected
        const connectionInfo = blockchainService.getConnectionInfo();
        
        //contract deployment status
        const contractDeployed = connectionInfo.contractAddress && connectionInfo.contractAddress !== 'Not deployed';

        //get the results for the total votes count (this might have warnings if the contract is not deployed)
        let totalVotes = '0';
        let chainStatusValue = 'Unavailable';
        
        //if the contract is deployed, get the votes and chain status
        if (contractDeployed) {
          const results = await blockchainService.getResults();
          totalVotes = results.totalVotes || '0';
          
          //get the verification status from the blockchain service
          const chainStatus = await blockchainService.verifyChain();
          chainStatusValue = chainStatus.verified ? 'Verified' : 'Unverified';
        } else {
          console.log('Contract not deployed - skipping votes and chain status requests');
        }
        
        //update the blockchain information with the new values
        setBlockInfo({
          currentBlock: connectionInfo.connected ? (contractDeployed ? 'Ready' : 'No Contract') : 'Not Connected',
          totalVotes: totalVotes,
          lastUpdate: new Date().toISOString(),
          networkStatus: connectionInfo.connected ? 'Connected' : 'Disconnected',
          chainStatus: chainStatusValue,
          contractDeployed: contractDeployed
        });
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
      
      {/* Contract Status Banner */}
      {!blockInfo.contractDeployed && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Contract not deployed. Voting functionality is limited.</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Contract Status</div>
          <div className={`text-2xl font-bold ${
            blockInfo.contractDeployed ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {blockInfo.contractDeployed ? 'Deployed' : 'Not Deployed'}
          </div>
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