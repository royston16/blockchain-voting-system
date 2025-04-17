import React, { useState, useEffect } from 'react';
import blockchainService from '../blockchain/ethereum-service';

function AdminPanel() {
  const [contractInfo, setContractInfo] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [simulationConfig, setSimulationConfig] = useState({
    totalVotes: '',
    batchSize: '', 
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

  const toggleSimulationConfig = () => {
    setShowSimulation(!showSimulation);
  };

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
        onProgress
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Election Management</h2>
      
      <div className="mb-8 p-4 bg-gray-50 rounded-md">
        <h3 className="text-lg font-semibold mb-2">Election Status</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium">Contract Status:</div>
          <div className="text-sm text-gray-600">
            {contractInfo.contractAddress && contractInfo.contractAddress !== 'Not deployed' 
              ? 'Active' 
              : 'Not Deployed'}
          </div>
          
          <div className="text-sm font-medium">Network:</div>
          <div className="text-sm text-gray-600">
            {contractInfo.networkDetails?.name || 'Unknown'}
          </div>
          
          <div className="text-sm font-medium">Deployment:</div>
          <div className="text-sm text-gray-600 truncate">
            {contractInfo.contractAddress || 'Use Configuration page to deploy'}
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Election Simulation</h3>
          <button
            onClick={toggleSimulationConfig}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            {showSimulation ? 'Hide Configuration' : 'Configure Simulation'}
          </button>
        </div>
        
        {showSimulation && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Votes to Simulate</label>
                <input 
                  type="number" 
                  value={simulationConfig.totalVotes}
                  onChange={handleTotalVotesChange}
                  min="1"
                  max="100000"
                  className="w-full p-2 border rounded-md"
                />
                {simulationConfig.totalVotes > 10000 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Large simulations may require multiple confirmations and take time to process.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Batch Size (votes per transaction)</label>
                <input 
                  type="number" 
                  value={simulationConfig.batchSize}
                  onChange={handleBatchSizeChange}
                  min="1"
                  max="500"
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Larger batches require fewer confirmations - all votes in a batch are processed in a single transaction
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Example: 1000 votes with batch size 100 = 10 confirmations (instead of 1000)
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Candidates and Vote Distribution</label>
                <div className="space-x-2">
                  <button 
                    onClick={addCandidate}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Add Candidate
                  </button>
                  <button 
                    onClick={equalizePercentages}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Equalize %
                  </button>
                  <button 
                    onClick={generateRandomDistribution}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                  >
                    Randomize %
                  </button>
                </div>
              </div>
              
              {simulationConfig.candidates.map((candidate, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={candidate.id}
                    onChange={(e) => handleCandidateChange(index, 'id', e.target.value)}
                    className="w-32 p-2 border rounded-md"
                    placeholder="ID"
                  />
                  <input
                    type="number"
                    value={candidate.percentage}
                    onChange={(e) => handleCandidateChange(index, 'percentage', Math.round(parseInt(e.target.value) || 0))}
                    min="0"
                    max="100"
                    className="w-20 p-2 border rounded-md"
                  />
                  <span className="text-sm">%</span>
                  <button
                    onClick={() => removeCandidate(index)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove candidate"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="mt-2 text-sm text-gray-600">
                Total: {Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0))}%
                {Math.round(simulationConfig.candidates.reduce((sum, c) => sum + c.percentage, 0)) !== 100 && (
                  <span className="text-red-500 ml-2">
                    (Should sum to 100%)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <button
            onClick={simulateElection}
            disabled={isSimulating || !contractInfo.contractAddress || contractInfo.contractAddress === 'Not deployed'}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 transition"
          >
            {isSimulating ? 'Simulating...' : 'Simulate Election'}
          </button>
          
          {statusMessage && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
              {statusMessage}
            </div>
          )}
          
          {(!contractInfo.contractAddress || contractInfo.contractAddress === 'Not deployed') && (
            <div className="mt-2 text-sm text-red-500">
              No active contract found. Use Configuration page to deploy a contract first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel; 