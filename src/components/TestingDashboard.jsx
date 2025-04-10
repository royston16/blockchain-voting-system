import React, { useState, useEffect, useRef } from 'react';
import blockchainService from '../blockchain/ethereum-service';

//testing dashboard for the ethereum connection
function TestingDashboard() {
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [electionInitialized, setElectionInitialized] = useState(false);
  
  //update the connection info when the component loads
  useEffect(() => {
    updateConnectionInfo();
    checkElectionStatus();
  }, []);
  
  //clear the feedback message after 5 seconds (if it is set)
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => {
        setActionFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  //get the connection info from the blockchain service
  const updateConnectionInfo = async () => {
    try {
      const info = await blockchainService.getConnectionInfo();
      setConnectionInfo(info);
    } catch (error) {
      console.error('Error updating connection info:', error);
      setConnectionInfo({
        isConnected: false,
        walletConnected: false,
        contractDeployed: false,
        mode: 'error',
        networkDetails: {
          error: error.message
        }
      });
    }
  };
  
  //handle refreshing the connection when the user clicks on it
  const handleRefreshConnection = async () => {
    try {
      setRefreshing(true);
      
      //safely disconnect first
      await blockchainService.disconnect();
      
      //set a small timeout to ensure clean disconnection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      //re-initialize the blockchain service
      await blockchainService.initialize();
      
      //update the connection info
      await updateConnectionInfo();
      
      //check the election status
      await checkElectionStatus();
      
      //set the action feedback
      setActionFeedback({
        type: 'success',
        message: 'Connection refreshed successfully'
      });
    } catch (error) {
      console.error('Failed to refresh connection:', error);
      setActionFeedback({
        type: 'error',
        message: `Error refreshing connection: ${error.message}`
      });
    } finally {
      setRefreshing(false);
    }
  };

  //deploy a new contract when the user clicks on "Deploy Contract" button
  const handleDeployContract = async () => {
    try {
      setDeploying(true);
      console.log('Starting contract deployment process...');
      
      //check if MetaMask is connected
      if (window.ethereum) {
        console.log('MetaMask detected, checking connection...');
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          console.log('MetaMask connected with account:', accounts[0]);
        } else {
          console.warn('MetaMask detected but no accounts connected');
          //try to request accounts explicitly
          try {
            console.log('Requesting MetaMask accounts...');
            const requestedAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            console.log('Account access granted:', requestedAccounts[0]);
          } catch (metamaskError) {
            console.error('Failed to request accounts from MetaMask:', metamaskError);
          }
        }
      } else {
        console.warn('MetaMask not detected');
      }
      
      //deploy the contract with MetaMask
      console.log('Calling deployContract method...');
      const result = await blockchainService.deployContract();
      console.log('Deploy contract result:', result);
      
      //display the success or error message after the contract is deployed
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: `Contract deployed successfully at ${result.contractAddress}!`
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `Failed to deploy contract: ${result.message || 'Unknown error'}`
        });
      }
      
      //update the connection info after the contract is deployed
      await updateConnectionInfo();
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      setActionFeedback({
        type: 'error',
        message: `Error deploying contract: ${error.message}`
      });
    } finally {
      setDeploying(false);
    }
  };

  //initialize the election with candidates when the user clicks on "Initialize Election" button - automatically done when the contract is deployed
  const handleInitializeElection = async () => {
    try {
      //use the proper contract check from the main connectionInfo object
      if (!connectionInfo.contractAddress || connectionInfo.contractAddress === 'Not deployed') {
        setActionFeedback({
          type: 'error',
          message: 'You must deploy a contract first'
        });
        return;
      }
      
      setActionFeedback({
        type: 'processing',
        message: 'Initializing election... Please confirm the transaction in MetaMask.'
      });
      
      const candidates = ['A', 'B', 'C'];
      const result = await blockchainService.initElection(
        'Demo Election',
        'DEMO2023',
        candidates,
        Math.floor(Date.now() / 1000),              //current time
        Math.floor(Date.now() / 1000) + 86400       //24 hours from now
      );
      
      //display the transaction status after the election is initialized
      if (result.success) {
        const txHash = result.transactionHash || 'Transaction confirmed (hash unavailable)';
        setActionFeedback({
          type: 'success',
          message: `Election initialized successfully! Transaction: ${txHash.substring(0, 10)}...`
        });
        //set the election as initialized
        setElectionInitialized(true);
      } else {
        //show a more user-friendly error message if the election is not initialized
        let errorMsg = result.error || 'Unknown error';
        
        //check for common errors and provide more helpful messages
        if (errorMsg.includes('MetaMask RPC error') || errorMsg.includes('Internal JSON-RPC error')) {
          errorMsg = 'MetaMask transaction failed. This could be due to:' +
                     '\n• Network connectivity issues' +
                     '\n• Insufficient ETH for gas fees' + 
                     '\n• The network may be congested' +
                     '\n\nPlease try refreshing your connection and trying again.';
        } else if (errorMsg.includes('rejected')) {
          errorMsg = 'Transaction was rejected in your wallet. Please try again when ready.';
        } else if (errorMsg.includes('gas')) {
          errorMsg = 'Not enough gas to complete the transaction. Please ensure you have sufficient ETH.';
        }
        
        setActionFeedback({
          type: 'error',
          message: `Failed to initialize election: ${errorMsg}`
        });
      }
      
      //update the connection info after the election is initialized
      await updateConnectionInfo();
    } catch (error) {
      console.error('Failed to initialize election:', error);
      
      //provide more user-friendly error messages for common errors
      let errorMsg = error.message || 'An unknown error occurred';
      
      if (errorMsg.includes('user rejected') || errorMsg.includes('rejected')) {
        errorMsg = 'Transaction was rejected in your wallet.';
      } else if (errorMsg.includes('insufficient funds')) {
        errorMsg = 'Not enough ETH to pay for transaction fees.';
      }
      
      setActionFeedback({
        type: 'error',
        message: `Error initializing election: ${errorMsg}`
      });
    }
  };
  
  //handle clearing the saved contract address when the user clicks on "Clear Contract" button
  const handleClearContract = async () => {
    try {
      //call the method to clear the contract address
      blockchainService.clearContractAddress();
      
      //reset the election status
      setElectionInitialized(false);
      
      //disconnect and reconnect
      await blockchainService.disconnect();
      await blockchainService.initialize();
      
      //update the connection info
      await updateConnectionInfo();
      
      //set the action feedback
      setActionFeedback({
        type: 'success',
        message: 'Contract address cleared and all vote data deleted. You can deploy a new contract now.'
      });
    } catch (error) {
      console.error('Failed to clear contract:', error);
      setActionFeedback({
        type: 'error',
        message: `Error clearing contract: ${error.message}`
      });
    }
  };
  
  //check if the election has been initialized
  const checkElectionStatus = async () => {
    try {
      const results = await blockchainService.getResults();
      //if we can get results and the contract is deployed, consider the election initialized if any operation was successful
      setElectionInitialized(results.success || (results.totalVotes !== undefined));
    } catch (error) {
      console.error('Error checking election status:', error);
      setElectionInitialized(false);
    }
  };

  //method to render the blockchain connection info
  const renderConnectionInfo = () => {
    if (!connectionInfo) return null;
    
    //get the network details from the connection info
    const networkDetails = connectionInfo.networkDetails || {};
    
    //more precise wallet connection check - needs initialized provider and signer
    const walletConnected = connectionInfo.connected && !networkDetails.readOnly && networkDetails.hasSigner;
    
    //check if the contract is actually deployed
    const contractDeployed = connectionInfo.contractAddress && connectionInfo.contractAddress !== 'Not deployed';
    
    //front end display of the connection info using HTML
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Ethereum Blockchain Connection</h3>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${walletConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">{walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}</span>
          </div>
          
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${contractDeployed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="font-medium">{contractDeployed ? 'Contract Deployed' : 'Contract Not Deployed'}</span>
          </div>
          
          <span className="ml-2 px-2 py-1 text-xs rounded bg-blue-200 text-blue-800">
            ETHEREUM NETWORK
          </span>
        </div>
        
        {/* Connection Status Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-3xl">
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">CONNECTION</h4>
            <div className="flex items-center">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${connectionInfo.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-sm">{connectionInfo.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">SIGNER</h4>
            <div className="flex items-center">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${networkDetails.hasSigner ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-sm">{networkDetails.hasSigner ? 'Available' : 'Not Available'}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">MODE</h4>
            <div className="flex items-center">
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${!networkDetails.readOnly ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium text-sm">{networkDetails.readOnly ? 'Read Only' : 'Read-Write'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md max-w-3xl">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Network Details</h4>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            {Object.entries(networkDetails)
              .filter(([key]) => key !== 'error' && typeof networkDetails[key] !== 'undefined')
              .map(([key, value]) => (
                <div key={key} className="p-2 bg-white rounded-md border border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-mono text-gray-800">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toString()}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Election Status Section */}
        {contractDeployed && (
          <div className="bg-gray-50 p-4 rounded-md mt-4 max-w-3xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Election Status</h4>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${electionInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">
                {electionInitialized ? 'Election Initialized' : 'Election Not Initialized'}
              </span>
            </div>
            
            <p className="text-sm mt-2 text-gray-600">
              {electionInitialized 
                ? 'Your election is ready for voting. You can now cast votes and view results.'
                : 'Initialize the election to set up candidates and enable voting.'}
            </p>

            {contractDeployed && connectionInfo.contractAddress && (
              <div className="mt-3 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                {connectionInfo.contractAddress}
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleRefreshConnection}
            disabled={refreshing}
            className={`px-3 py-1 ${refreshing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm rounded flex items-center`}
          >
            {refreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : "Refresh Connection"}
          </button>
          
          <button
            onClick={handleDeployContract}
            disabled={deploying || !walletConnected}
            className={`px-3 py-1 ${deploying || !walletConnected ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white text-sm rounded flex items-center`}
          >
            {deploying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying...
              </>
            ) : "Deploy New Contract"}
          </button>
          
          <button
            onClick={handleInitializeElection}
            disabled={!walletConnected || !contractDeployed}
            className={`px-3 py-1 ${
              !walletConnected || !contractDeployed ? 'bg-gray-400' : 
              electionInitialized ? 'bg-green-600 hover:bg-green-700' : 
              'bg-purple-600 hover:bg-purple-700'
            } text-white text-sm rounded flex items-center`}
          >
            {electionInitialized ? '✓ Election Ready' : 'Initialize Election'}
          </button>
          
          <button
            onClick={handleClearContract}
            disabled={!walletConnected || !contractDeployed}
            className={`px-3 py-1 ${!walletConnected || !contractDeployed ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white text-sm rounded flex items-center`}
          >
            Clear Contract
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Blockchain Testing Dashboard</h2>
      
      {actionFeedback && (
        <div className={`p-4 mb-6 rounded-lg ${
          actionFeedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          actionFeedback.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          <p className="whitespace-pre-line">{actionFeedback.message}</p>
        </div>
      )}
      
      {/* Connection info section */}
      {renderConnectionInfo()}
    </div>
  );
}

export default TestingDashboard;