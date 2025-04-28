import React, { useState, useEffect } from 'react';
import blockchainService from '../blockchain/ethereum-service';
import { Link } from 'react-router-dom';

function AdminPanel() {
  const [contractInfo, setContractInfo] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [simulationConfig, setSimulationConfig] = useState({
    totalVotes: 100,
    batchSize: 50, 
    optimizeGas: true,
    candidates: [
      { id: "candidate1", name: "Candidate 1", percentage: 40 },
      { id: "candidate2", name: "Candidate 2", percentage: 35 },
      { id: "candidate3", name: "Candidate 3", percentage: 25 },
    ]
  });

  useEffect(() => {
    async function getContractInfo() {
      const info = blockchainService.getConnectionInfo();
      setContractInfo(info);
    }
    
    getContractInfo();
    
    // Set up event listener for contract changes
    window.addEventListener('contractDataCleared', getContractInfo);
    window.addEventListener('voteDataUpdated', getContractInfo);
    
    return () => {
      window.removeEventListener('contractDataCleared', getContractInfo);
      window.removeEventListener('voteDataUpdated', getContractInfo);
    };
  }, []);

  const handleCandidateChange = (index, field, value) => {
    const updatedCandidates = [...simulationConfig.candidates];
    
    // If this is a percentage update, ensure it's a whole number
    if (field === 'percentage') {
      value = Math.round(value);
    }
    
    updatedCandidates[index] = {
      ...updatedCandidates[index],
      [field]: value
    };
    
    setSimulationConfig(prev => ({
      ...prev,
      candidates: updatedCandidates
    }));
  };

  const handleTotalVotesChange = (e) => {
    const value = e.target.value === '' ? '' : parseInt(e.target.value);
    setSimulationConfig(prev => ({
      ...prev,
      totalVotes: value
    }));
  };

  const handleBatchSizeChange = (e) => {
    const value = e.target.value === '' ? '' : parseInt(e.target.value);
    setSimulationConfig(prev => ({
      ...prev,
      batchSize: value
    }));
  };

  const addCandidate = () => {
    const newId = `candidate${simulationConfig.candidates.length + 1}`;
    const newCandidate = {
      id: newId,
      name: `Candidate ${simulationConfig.candidates.length + 1}`,
      percentage: 0
    };
    
    setSimulationConfig(prev => ({
      ...prev,
      candidates: [...prev.candidates, newCandidate]
    }));
  };

  const removeCandidate = (index) => {
    if (simulationConfig.candidates.length <= 2) {
      setStatusMessage("You need at least 2 candidates for an election");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }
    
    const updatedCandidates = [...simulationConfig.candidates];
    updatedCandidates.splice(index, 1);
    
    setSimulationConfig(prev => ({
      ...prev,
      candidates: updatedCandidates
    }));
  };

  const equalizePercentages = () => {
    const equalPercentage = Math.floor(100 / simulationConfig.candidates.length);
    const remainder = 100 - (equalPercentage * simulationConfig.candidates.length);
    
    const updatedCandidates = simulationConfig.candidates.map((candidate, index) => ({
      ...candidate,
      percentage: Math.round(equalPercentage + (index === 0 ? remainder : 0))
    }));
    
    setSimulationConfig(prev => ({
      ...prev,
      candidates: updatedCandidates
    }));
  };
  
  // Generate random vote distribution
  const generateRandomDistribution = () => {
    const candidates = [...simulationConfig.candidates];
    let remaining = 100;
    
    // Assign random percentages to all candidates except the last one
    for (let i = 0; i < candidates.length - 1; i++) {
      // Don't allocate all remaining votes to ensure each candidate gets some
      const max = Math.min(remaining - (candidates.length - i - 1), 90);
      const min = Math.max(1, remaining * 0.05); // Ensure at least 5% of remaining
      
      // Generate a random percentage as a whole number
      const percentage = Math.round(Math.random() * (max - min) + min);
      
      candidates[i].percentage = percentage;
      remaining -= percentage;
    }
    
    // Assign remaining percentage to the last candidate as a whole number
    candidates[candidates.length - 1].percentage = remaining;
    
    // Shuffle the candidates to randomize the order
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    setSimulationConfig(prev => ({
      ...prev,
      candidates
    }));
  };

  const toggleGasOptimization = () => {
    setSimulationConfig(prev => ({
      ...prev,
      optimizeGas: !prev.optimizeGas
    }));
  };

  const simulateElection = async () => {
    if (isSimulating) return;
    
    // Check if contract is deployed
    if (!contractInfo.contractAddress || contractInfo.contractAddress === 'Not deployed') {
      setStatusMessage("Please use Configuration page to deploy a contract first");
      setTimeout(() => setStatusMessage(""), 5000);
      return;
    }

    // Validate that totalVotes and batchSize are valid numbers
    if (simulationConfig.totalVotes === '' || isNaN(simulationConfig.totalVotes) || simulationConfig.totalVotes <= 0) {
      setStatusMessage("Please enter a positive number for Total Votes");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    if (simulationConfig.batchSize === '' || isNaN(simulationConfig.batchSize) || simulationConfig.batchSize <= 0) {
      setStatusMessage("Please enter a positive number for Batch Size");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }
    
    // Check if percentages add up to 100
    const totalPercentage = simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0);
    if (totalPercentage !== 100) {
      setStatusMessage("Vote distribution percentages must add up to 100%");
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }
    
    // Validate batch size and total votes (only enforce maximum values)
    const batchSize = Math.min(simulationConfig.batchSize, 500);
    const totalVotes = Math.min(simulationConfig.totalVotes, 100000);
    
    if (batchSize !== simulationConfig.batchSize || totalVotes !== simulationConfig.totalVotes) {
      setSimulationConfig(prev => ({ 
        ...prev, 
        batchSize,
        totalVotes 
      }));
    }
    
    // Warn users about very large simulations
    let confirmed = true;
    if (totalVotes > 10000) {
      confirmed = window.confirm(
        `You are about to simulate ${totalVotes} votes. This may take a while and require multiple MetaMask confirmations. Continue?`
      );
    } else if (totalVotes > 1000) {
      confirmed = window.confirm(
        `You are about to simulate ${totalVotes} votes with ${Math.ceil(totalVotes/batchSize)} batches. Continue?`
      );
    } else {
      confirmed = window.confirm(
        `This will simulate ${totalVotes} votes with the configured distribution. Continue?`
      );
    }
    
    if (!confirmed) return;
    
    setIsSimulating(true);
    setStatusMessage("Preparing simulation data...");
    
    try {
      // Calculate votes for each candidate based on percentages
      const candidateVotes = simulationConfig.candidates.map(candidate => {
        return {
          id: candidate.id,
          name: candidate.name,
          votes: Math.floor((totalVotes * candidate.percentage) / 100)
        };
      });
      
      // Adjust for rounding errors to ensure we get exactly the total number of votes
      let allocatedVotes = candidateVotes.reduce((sum, c) => sum + c.votes, 0);
      if (allocatedVotes < totalVotes) {
        // Add remaining votes to the first candidate
        candidateVotes[0].votes += (totalVotes - allocatedVotes);
      }
      
      // Prepare all vote data in memory first
      const allVotes = [];
      
      // Create vote objects for each candidate
      for (const candidate of candidateVotes) {
        for (let i = 0; i < candidate.votes; i++) {
          const voterHash = `sim_voter_${Math.random().toString(36).substring(2, 15)}`;
          const sessionId = `sim_session_${Math.random().toString(36).substring(2, 15)}`;
          allVotes.push({
            voterHash,
            candidateId: candidate.id,
            sessionId,
            email: `sim_${voterHash.slice(0, 8)}@example.com`
          });
        }
      }
      
      // Shuffle the votes to randomize the order
      for (let i = allVotes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allVotes[i], allVotes[j]] = [allVotes[j], allVotes[i]];
      }
      
      setStatusMessage(`Prepared ${allVotes.length} votes - beginning processing...`);
      
      // Define progress callback for batch processing
      const onProgress = (progressData) => {
        const { phase, processedVotes, totalVotes, percentComplete, processedChunks, totalChunks, error } = progressData;
        
        switch (phase) {
          case 'preparing':
            setStatusMessage(`Preparing to process ${totalVotes} votes in ${totalChunks} chunks...`);
            break;
            
          case 'processing':
            setStatusMessage(`Processing: ${processedVotes}/${totalVotes} votes (${percentComplete}%) - Completed ${processedChunks}/${totalChunks} chunks`);
            break;
            
          case 'error':
            setStatusMessage(`Error in chunk ${processedChunks}/${totalChunks}: ${error}. Continuing with next chunk...`);
            break;
            
          case 'complete':
            setStatusMessage(`Election simulation complete: ${progressData.successCount} votes successful, ${progressData.failureCount} failed.`);
            break;
            
          case 'fatal':
            setStatusMessage(`Simulation failed: ${error}`);
            break;
            
          default:
            setStatusMessage(`Processing votes: ${processedVotes}/${totalVotes}`);
        }
      };
      
      // Use the enhanced batchCastVotes method with progress reporting
      await blockchainService.batchCastVotes(allVotes, {
        chunkSize: batchSize,
        onProgress,
        optimizeGas: simulationConfig.optimizeGas
      });
      
      setStatusMessage(`Election simulation complete! ${allVotes.length} votes processed.`);
    } catch (error) {
      console.error('Simulation error:', error);
      setStatusMessage(`Simulation error: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Election Management</h2>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Contract Status</h3>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium">Contract Address:</div>
              <div className={`mt-1 ${contractInfo.contractAddress && contractInfo.contractAddress !== 'Not deployed' ? 'text-green-600' : 'text-red-600'}`}>
                {contractInfo.contractAddress || 'Not deployed'}
              </div>
            </div>
            <div>
              <div className="font-medium">Network:</div>
              <div className="mt-1">
                {contractInfo.networkDetails?.name || 'Unknown'} (Chain ID: {contractInfo.networkDetails?.chainId || 'Unknown'})
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Election Simulation</h3>
          <p className="text-indigo-700 mb-4">
            Configure and run a simulated election with customized vote distribution.
          </p>
          
          <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
              <label className="block text-sm font-medium mb-1 text-gray-700">Total Votes to Simulate</label>
              <input 
                type="number" 
                value={simulationConfig.totalVotes}
                onChange={handleTotalVotesChange}
                min="1"
                max="100000"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {simulationConfig.totalVotes > 10000 && (
                <p className="text-xs text-amber-600 mt-1">
                  Large simulations may require multiple confirmations and take time to process.
                </p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm">
              <label className="block text-sm font-medium mb-1 text-gray-700">Batch Size (votes per transaction)</label>
              <input 
                type="number" 
                value={simulationConfig.batchSize}
                onChange={handleBatchSizeChange}
                min="1"
                max="500"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Larger batches = fewer confirmations (max 500 votes per transaction)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Optimal gas efficiency: 50-100 votes per batch for most networks
              </p>
            </div>
          </div>
          
          <div className="mb-4 bg-white p-4 rounded-md shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gas Optimization</label>
                <p className="text-xs text-gray-500">Enable for cheaper transactions with large batches</p>
              </div>
              <button 
                onClick={toggleGasOptimization} 
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${simulationConfig.optimizeGas ? 'bg-green-600' : 'bg-gray-300'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${simulationConfig.optimizeGas ? 'translate-x-6' : 'translate-x-1'}`} 
                />
              </button>
            </div>
          </div>
          
          <div className="mb-5">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Candidates and Vote Distribution</label>
              <div className="space-x-2">
                <button 
                  onClick={addCandidate}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add Candidate
                </button>
                <button 
                  onClick={equalizePercentages}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Equalize %
                </button>
                <button 
                  onClick={generateRandomDistribution}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Randomize %
                </button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-md shadow-sm">
              {simulationConfig.candidates.map((candidate, index) => (
                <div key={index} className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    value={candidate.id}
                    onChange={(e) => handleCandidateChange(index, 'id', e.target.value)}
                    className="w-32 p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ID"
                  />
                  <div className="flex-grow">
                    <input
                      type="range"
                      value={candidate.percentage}
                      onChange={(e) => handleCandidateChange(index, 'percentage', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="w-full"
                    />
                  </div>
                  <div className="w-20 flex items-center">
                    <input
                      type="number"
                      value={candidate.percentage}
                      onChange={(e) => handleCandidateChange(index, 'percentage', Math.round(parseInt(e.target.value) || 0))}
                      min="0"
                      max="100"
                      className="w-16 p-2 border rounded-md text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-sm ml-1">%</span>
                  </div>
                  <button
                    onClick={() => removeCandidate(index)}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                    title="Remove candidate"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="mt-3 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Total: <span className={Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0)) !== 100 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                    {Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0))}%
                  </span>
                  {Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0)) !== 100 && (
                    <span className="text-red-500 ml-2">
                      (Should sum to 100%)
                    </span>
                  )}
                </div>
                
                <button
                  onClick={simulateElection}
                  disabled={isSimulating || !contractInfo.contractAddress || contractInfo.contractAddress === 'Not deployed' || Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0)) !== 100}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {isSimulating ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>
            </div>
          </div>
          
          {statusMessage && (
            <div className="mt-4 p-4 bg-white rounded-md shadow-sm">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Status:</h4>
              <div className="p-3 bg-gray-50 rounded border text-sm overflow-auto max-h-32">
                {statusMessage}
              </div>
            </div>
          )}
          
          {(!contractInfo.contractAddress || contractInfo.contractAddress === 'Not deployed') && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                No active contract found. Use Configuration page to deploy a contract first.
              </div>
              <div className="mt-2 text-center">
                <Link 
                  to="/admin/configuration" 
                  className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Go to Configuration
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel; 