import React, { useState, useEffect } from 'react';
import { generateMockVotes, analyzePerformance, identifyBottlenecks, getOptimizationPatterns } from '../blockchain/mockVoteGenerator';
import blockchainService from '../blockchain/fabric-gateway';
import ethblockchainService from '../blockchain/eth-gateway';

//store metrics in sessionStorage to persist between navigation
const loadStoredData = () => {
  try {
    const storedVotes = sessionStorage.getItem('testing_votes');
    const storedResults = sessionStorage.getItem('testing_results');
    return {
      votes: storedVotes ? JSON.parse(storedVotes) : null,
      results: storedResults ? JSON.parse(storedResults) : null
    };
  } catch (e) {
    console.error('Error loading stored test data:', e);
    return { votes: null, results: null };
  }
};

//save metrics to sessionStorage
const saveDataToStorage = (votes, results) => {
  try {
    if (votes) sessionStorage.setItem('testing_votes', JSON.stringify(votes));
    if (results) sessionStorage.setItem('testing_results', JSON.stringify(results));
  } catch (e) {
    console.error('Error saving test data:', e);
  }
};

//method to display the testing dashboard for the mock vote generation
export default function TestingDashboard() {
  //load stored data from session storage on initial render
  const storedData = loadStoredData();
  
  const [votes, setVotes] = useState(storedData.votes);
  const [results, setResults] = useState(storedData.results);
  const [isGenerating, setIsGenerating] = useState(false);
  const [voteCount, setVoteCount] = useState(100);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [useMock, setUseMock] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingVotes, setClearingVotes] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  
  //on component mount, get the useMock setting from the blockchain service
  useEffect(() => {
    setUseMock(blockchainService.useMock);
  }, []);
  
  //when the useMock state changes, update the blockchain service
  useEffect(() => {
    blockchainService.useMock = useMock;
    console.log(`Blockchain mode set to: ${useMock ? 'Mock' : 'Real'}`);
  }, [useMock]);
  
  //update stored data when votes or results change
  useEffect(() => {
    saveDataToStorage(votes, results);
  }, [votes, results]);
  
  //get the connection info
  const updateConnectionInfo = async () => {
    setConnectionInfo(blockchainService.getConnectionInfo());
  };
  
  //update connection info when component loads and when mock mode changes
  useEffect(() => {
    updateConnectionInfo();
  }, [useMock]);
  
  //clear feedback message after 5 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => {
        setActionFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);
  
  //method to generate mock votes
  const handleGenerateVotes = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const mockResults = await generateMockVotes(voteCount);
      const performanceMetrics = analyzePerformance(mockResults);
      
      //identify bottlenecks for optimization
      const systemBottlenecks = identifyBottlenecks(performanceMetrics);
      setBottlenecks(systemBottlenecks);
      
      //update state with the results
      setVotes(mockResults.votes);
      setResults(performanceMetrics);
      setDistribution(calculateDistribution(mockResults.votes));
      setPerformance(null);
      
      //store in session storage for persistence
      sessionStorage.setItem('testing_votes', JSON.stringify(mockResults.votes));
      sessionStorage.setItem('testing_results', JSON.stringify(performanceMetrics));
      
      console.log('Performance metrics:', performanceMetrics);
      
      setActionFeedback({
        type: 'success',
        message: `Successfully recorded ${performanceMetrics.uniqueVotesProcessed || performanceMetrics.totalVotes} unique votes in the blockchain (${performanceMetrics.successRate}% accuracy)`
      });
    } catch (error) {
      console.error('Failed to generate mock votes:', error);
      setActionFeedback({
        type: 'error',
        message: `Error generating votes: ${error.message}`
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  //method to clear the test data
  const handleClearData = async () => {
    try {
      setClearingVotes(true);
      
      //use the blockchain service's clearAllVotes method
      const result = await blockchainService.clearAllVotes();
      
      //reset state
      setVotes(null);
      setResults(null);
      setPerformance(null);
      setDistribution(null);
      setBottlenecks([]);
      
      //clear session storage as well
      sessionStorage.removeItem('testing_votes');
      sessionStorage.removeItem('testing_results');
      
      //update connection info to reflect new state
      await updateConnectionInfo();
      
      setActionFeedback({
        type: 'success',
        message: 'All vote data cleared successfully'
      });
      
      console.log('Vote data cleared');
    } catch (error) {
      console.error('Failed to clear vote data:', error);
      setActionFeedback({
        type: 'error',
        message: `Error clearing votes: ${error.message}`
      });
    } finally {
      setClearingVotes(false);
    }
  };
  
  //handle refreshing the connection
  const handleRefreshConnection = async () => {
    try {
      setRefreshing(true);
      
      //re-initialize the blockchain service
      await blockchainService.initialize();
      
      //update connection info
      await updateConnectionInfo();
      
      setActionFeedback({
        type: 'success',
        message: `Connection refreshed successfully (${blockchainService.useMock ? 'Mock' : 'Real'} mode)`
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

  const getScalabilityRating = (ratio) => {
    if (ratio >= 0.9) return { 
      label: 'Excellent', 
      color: 'text-green-600', 
      description: 'Near-linear scaling with batch size' 
    };
    if (ratio >= 0.75) return { 
      label: 'Good', 
      color: 'text-blue-600', 
      description: 'Efficient scaling with larger batches' 
    };
    if (ratio >= 0.6) return { 
      label: 'Fair', 
      color: 'text-yellow-600', 
      description: 'Acceptable performance with larger batches' 
    };
    return { 
      label: 'Poor', 
      color: 'text-red-600', 
      description: 'Significant slowdown with larger batches' 
    };
  };

  const renderPerformanceMetrics = () => {
    if (!results) return null;
    
    const scalabilityRating = getScalabilityRating(results.scalability?.scalabilityRatio || 0);
    
    return (
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">THROUGHPUT</h4>
            <p className="text-3xl font-bold text-indigo-600">{results.throughput}</p>
            <p className="text-xs text-gray-500">votes per second</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">AVERAGE LATENCY</h4>
            <p className="text-3xl font-bold text-indigo-600">{results.averageLatency}</p>
            <p className="text-xs text-gray-500">milliseconds</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">BLOCKCHAIN ACCURACY</h4>
            <p className="text-3xl font-bold text-indigo-600">{results.successRate}%</p>
            <p className="text-xs text-gray-500">of unique votes recorded</p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mb-4">
          <button 
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
          </button>
        </div>
        
        {showAdvancedMetrics && (
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-4">Vote Processing Analysis</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">REQUESTED VOTES</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.requestedVotes || results.totalVotes || 0}
                </p>
                <p className="text-xs text-gray-500">original votes requested</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">RECORDED VOTES</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.uniqueVotesProcessed || results.totalVotes || 0}
                </p>
                <p className="text-xs text-gray-500">unique votes in blockchain</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">REJECTED DUPLICATES</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.totalAttempts ? (results.totalAttempts - (results.uniqueVotesProcessed || results.totalVotes)) : 0}
                </p>
                <p className="text-xs text-gray-500">duplicate attempts rejected</p>
              </div>
            </div>
            
            <h4 className="text-md font-semibold mb-4">Scalability Analysis</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">SMALL BATCH</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.scalability?.smallBatch?.toFixed(2) || 0}
                </p>
                <p className="text-xs text-gray-500">votes/sec</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">MEDIUM BATCH</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.scalability?.mediumBatch?.toFixed(2) || 0}
                </p>
                <p className="text-xs text-gray-500">votes/sec</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">LARGE BATCH</h5>
                <p className="text-2xl font-bold text-indigo-600">
                  {results.scalability?.largeBatch?.toFixed(2) || 0}
                </p>
                <p className="text-xs text-gray-500">votes/sec</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">SCALABILITY RATING</h5>
                <p className={`text-2xl font-bold ${scalabilityRating.color}`}>
                  {scalabilityRating.label}
                </p>
                <p className="text-xs text-gray-500">
                  Ratio: {(results.scalability?.scalabilityRatio || 0).toFixed(2)}
                </p>
                <p className="text-xs mt-1 italic">
                  {scalabilityRating.description}
                </p>
              </div>
            </div>
            
            <h4 className="text-md font-semibold mb-4">Detailed Performance</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">P95 LATENCY</h5>
                <p className="text-2xl font-bold text-indigo-600">{results.p95Latency || 0}</p>
                <p className="text-xs text-gray-500">milliseconds</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">P99 LATENCY</h5>
                <p className="text-2xl font-bold text-indigo-600">{results.p99Latency || 0}</p>
                <p className="text-xs text-gray-500">milliseconds</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-semibold text-gray-500 mb-2">THROUGHPUT STABILITY</h5>
                <p className="text-2xl font-bold text-indigo-600">{results.throughputStability || 0}</p>
                <p className="text-xs text-gray-500">std. deviation</p>
              </div>
            </div>
            
            {/* Error Distribution if any errors */}
            {results.errorRates && Object.keys(results.errorRates).length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-4">Error Analysis</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h5 className="text-sm font-semibold text-gray-500 mb-2">ERROR DISTRIBUTION</h5>
                  <div className="overflow-auto max-h-40">
                    {Object.entries(results.errorRates).map(([error, count]) => (
                      <div key={error} className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span className="text-red-600 truncate max-w-xs">{error}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-2">Summary</h4>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm">
              Processed <span className="font-semibold">{results.uniqueVotesProcessed || results.totalVotes}</span> unique votes in{' '}
              <span className="font-semibold">{results.totalDuration}</span> with a{' '}
              <span className="font-semibold">{results.successRate}%</span> blockchain accuracy rate.
              The system achieved a throughput of <span className="font-semibold">{results.throughput}</span> votes/sec
              with an average latency of <span className="font-semibold">{results.averageLatency}ms</span>.
              {results.totalAttempts > 0 && (
                <span> The system correctly identified and rejected <span className="font-semibold">
                  {results.totalAttempts - (results.uniqueVotesProcessed || results.totalVotes)}
                </span> duplicate vote attempts.</span>
              )}
              {results.scalability?.scalabilityRatio > 0 && (
                <span>
                  {' '}Scalability testing shows a <span className={`font-semibold ${scalabilityRating.color}`}>{scalabilityRating.label.toLowerCase()}</span>{' '}
                  rating (ratio: {(results.scalability?.scalabilityRatio || 0).toFixed(2)}), indicating {scalabilityRating.description.toLowerCase()}.
                </span>
              )}
            </p>
            
            {/* Add "View Optimization Patterns" button */}
            {bottlenecks.length > 0 && (
              <div className="mt-3">
                <button 
                  onClick={() => setShowOptimizationModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 text-sm"
                >
                  View Optimization Patterns
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* System Optimization Insights */}
        <div className="mt-6">
          <h4 className="text-md font-semibold mb-2">System Optimization Insights</h4>
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="text-sm font-semibold mb-3">Components to Optimize</h5>
            <div className="space-y-3">
              {/* Batch Processing Recommendations */}
              <div className="flex items-start">
                <div className={`w-3 h-3 mt-1 rounded-full mr-2 ${results.scalability?.scalabilityRatio > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <p className="text-sm font-medium">Batch Processing</p>
                  <p className="text-xs text-gray-600">
                    {results.scalability?.scalabilityRatio > 0.8 
                      ? 'Optimized: Your batch processing is working efficiently.' 
                      : 'Potential improvement: Consider increasing the batch size or optimizing duplicate checks.'}
                  </p>
                </div>
              </div>
              
              {/* LocalStorage Recommendations */}
              <div className="flex items-start">
                <div className={`w-3 h-3 mt-1 rounded-full mr-2 ${results.averageLatency < 5 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <p className="text-sm font-medium">Storage Access</p>
                  <p className="text-xs text-gray-600">
                    {results.averageLatency < 5
                      ? 'Optimized: Fast storage access with minimal overhead.'
                      : 'Potential improvement: Consider using indexed storage or memory caching for frequently accessed data.'}
                  </p>
                </div>
              </div>
              
              {/* Duplicate Detection Efficiency */}
              <div className="flex items-start">
                <div className={`w-3 h-3 mt-1 rounded-full mr-2 ${parseFloat(results.throughput) > 1000 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <p className="text-sm font-medium">Duplicate Detection</p>
                  <p className="text-xs text-gray-600">
                    {parseFloat(results.throughput) > 1000
                      ? 'Optimized: Your duplicate detection algorithm is fast and efficient.'
                      : 'Potential improvement: Consider using Set data structures for O(1) lookup in duplicate vote detection.'}
                  </p>
                </div>
              </div>
              
              {/* Memory Management */}
              <div className="flex items-start">
                <div className={`w-3 h-3 mt-1 rounded-full mr-2 ${
                  results.uniqueVotesProcessed > 500 && parseFloat(results.throughputStability) < 100 ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium">Memory Management</p>
                  <p className="text-xs text-gray-600">
                    {results.uniqueVotesProcessed > 500 && parseFloat(results.throughputStability) < 100
                      ? 'Optimized: Your application maintains stable performance with larger datasets.'
                      : 'Potential improvement: Consider implementing chunked processing and explicit memory cleanup.'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Detailed Bottlenecks Analysis */}
            {showAdvancedMetrics && (
              <div className="mt-5 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-semibold mb-3 flex items-center">
                  <span>Detailed System Analysis</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">Advanced</span>
                </h5>
                
                {bottlenecks.length > 0 ? (
                  <div className="space-y-3">
                    {bottlenecks.map((bottleneck, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                        <div className="flex items-center mb-1">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            bottleneck.severity === 'high' ? 'bg-red-500' : 
                            bottleneck.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <h6 className="text-sm font-medium">{bottleneck.component}</h6>
                          <span className="ml-2 text-xs text-gray-500">in {bottleneck.location}</span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{bottleneck.recommendation}</p>
                        <p className="text-xs italic text-gray-500">{bottleneck.metrics}</p>
                        
                        {/* Add the optimization pattern code example */}
                        {getOptimizationPatterns(bottleneck) && (
                          <div className="mt-3">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium">Code Optimization Pattern:</p>
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {getOptimizationPatterns(bottleneck).fileToModify}
                              </span>
                            </div>
                            <div className="mt-1 p-3 bg-gray-800 text-gray-100 rounded text-xs overflow-auto max-h-60">
                              <pre>{getOptimizationPatterns(bottleneck).code}</pre>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              This pattern can be applied to {getOptimizationPatterns(bottleneck).description.toLowerCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-sm text-green-700">No significant bottlenecks detected in the current configuration.</p>
                    <p className="text-xs text-green-600 mt-1">Your system is performing well with the current load.</p>
                  </div>
                )}
                
                <div className="mt-4">
                  <h6 className="text-xs font-semibold text-gray-700 mb-2">Optimization Strategy</h6>
                  <p className="text-xs text-gray-600">
                    {bottlenecks.length > 0 ? 
                      "Focus on high severity issues first, as they'll provide the most significant performance improvements." :
                      "Continue monitoring performance as vote volume increases. Consider stress testing with larger batch sizes."
                    }
                  </p>
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h5 className="text-sm font-semibold mb-2">Recommended Next Steps</h5>
              <ol className="list-decimal list-inside text-xs space-y-1 text-gray-700">
                {results.scalability?.scalabilityRatio < 0.8 && (
                  <li>Optimize batch processing in <code className="bg-gray-200 px-1 rounded">src/blockchain/fabric-gateway.js</code></li>
                )}
                {results.averageLatency > 5 && (
                  <li>Improve storage access in <code className="bg-gray-200 px-1 rounded">src/blockchain/fabric-gateway.js</code></li>
                )}
                {parseFloat(results.throughput) < 1000 && (
                  <li>Enhance duplicate detection in <code className="bg-gray-200 px-1 rounded">src/blockchain/fabric-gateway.js</code></li>
                )}
                {parseFloat(results.throughputStability) > 100 && (
                  <li>Improve memory management in <code className="bg-gray-200 px-1 rounded">src/blockchain/mockVoteGenerator.js</code></li>
                )}
                <li>Consider implementing vote batching by time intervals in production environments</li>
                <li>Add monitoring for system resource usage during peak voting periods</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={generateReport}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            disabled={!results}
          >
            Generate Report
          </button>
        </div>
      </div>
    );
  };

  // Toggle implementation mode
  const toggleImplementationMode = async (useMockMode) => {
    try {
      blockchainService.setImplementationMode(useMockMode);
      setUseMock(useMockMode);
      updateConnectionInfo();
      
      setActionFeedback({
        type: 'success',
        message: `Switched to ${useMockMode ? 'Mock' : 'Real Blockchain'} mode`
      });
    } catch (error) {
      console.error('Failed to toggle implementation mode:', error);
      setActionFeedback({
        type: 'error',
        message: `Error: ${error.message}`
      });
    }
  };
  
  // Render blockchain connection info
  const renderConnectionInfo = () => {
    if (!connectionInfo) return null;
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Blockchain Connection</h3>
        
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-2 ${connectionInfo.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">{connectionInfo.isConnected ? 'Connected' : 'Disconnected'}</span>
          <span className="ml-2 px-2 py-1 text-xs rounded bg-gray-200">
            {connectionInfo.mode === 'mock' ? 'MOCK MODE' : 'REAL BLOCKCHAIN'}
          </span>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Network Details</h4>
          
          <div className="space-y-2 text-sm">
            {Object.entries(connectionInfo.networkDetails).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3">
                <span className="text-gray-600 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="col-span-2 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
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
        </div>
      </div>
    );
  };

  // Render action feedback message
  const renderActionFeedback = () => {
    if (!actionFeedback) return null;
    
    const bgColor = actionFeedback.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = actionFeedback.type === 'success' ? 'text-green-800' : 'text-red-800';
    
    return (
      <div className={`p-4 ${bgColor} border rounded-md mb-6 flex items-center justify-between`}>
        <p className={`${textColor}`}>
          {actionFeedback.message}
        </p>
        <button 
          onClick={() => setActionFeedback(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  };

  // Add a new generateReport function
  const generateReport = () => {
    if (!results) return;
    
    // Create a formatted date for the filename
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `blockchain-test-report-${formattedDate}-${formattedTime}`;
    
    //create the HTML content for the report
    const scalabilityRating = getScalabilityRating(results.scalability?.scalabilityRatio || 0);
    
    //content for the report in HTML format
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Blockchain Testing Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eaeaea;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        h1 {
          color: #2a4cbb;
        }
        h2 {
          color: #3b5fd9;
          margin-top: 30px;
        }
        h3 {
          color: #5577de;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .metric:last-child {
          border-bottom: none;
        }
        .metric-name {
          font-weight: 600;
        }
        .metric-value {
          font-family: monospace;
        }
        .summary {
          background-color: #e9eeff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .rating {
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 3px;
        }
        .rating-excellent {
          background-color: #d4edda;
          color: #155724;
        }
        .rating-good {
          background-color: #cce5ff;
          color: #004085;
        }
        .rating-fair {
          background-color: #fff3cd;
          color: #856404;
        }
        .rating-poor {
          background-color: #f8d7da;
          color: #721c24;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 12px;
          color: #666;
        }
        .box {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Blockchain Testing Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Implementation Mode: ${useMock ? 'Mock (LocalStorage)' : 'Real Hyperledger Fabric Network'}</p>
      </div>

      <div class="section">
        <h2>Test Summary</h2>
        <div class="summary">
          <p>
            Processed <strong>${results.uniqueVotesProcessed || results.totalVotes}</strong> unique votes in 
            <strong>${results.totalDuration}</strong> with a 
            <strong>${results.successRate}%</strong> blockchain accuracy rate.
            The system achieved a throughput of <strong>${results.throughput}</strong> votes/sec
            with an average latency of <strong>${results.averageLatency}ms</strong>.
            ${results.totalAttempts ? `The system correctly identified and rejected 
            <strong>${results.totalAttempts - (results.uniqueVotesProcessed || results.totalVotes)}</strong> 
            duplicate vote attempts.` : ''}
            ${results.scalability?.scalabilityRatio ? 
              `Scalability testing shows a <span class="rating rating-${scalabilityRating.label.toLowerCase()}">${scalabilityRating.label}</span> 
              rating (ratio: ${(results.scalability?.scalabilityRatio || 0).toFixed(2)}), 
              indicating ${scalabilityRating.description.toLowerCase()}.` : ''}
          </p>
        </div>
      </div>

      <div class="section">
        <h2>Performance Metrics</h2>
        
        <div class="box">
          <h3>Core Metrics</h3>
          <div class="metric">
            <span class="metric-name">Throughput:</span>
            <span class="metric-value">${results.throughput} votes/sec</span>
          </div>
          <div class="metric">
            <span class="metric-name">Average Latency:</span>
            <span class="metric-value">${results.averageLatency} ms</span>
          </div>
          <div class="metric">
            <span class="metric-name">Blockchain Accuracy:</span>
            <span class="metric-value">${results.successRate}%</span>
          </div>
          <div class="metric">
            <span class="metric-name">Total Duration:</span>
            <span class="metric-value">${results.totalDuration}</span>
          </div>
        </div>
        
        <div class="box">
          <h3>Vote Statistics</h3>
          <div class="metric">
            <span class="metric-name">Requested Votes:</span>
            <span class="metric-value">${results.requestedVotes || results.totalVotes || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Recorded Votes:</span>
            <span class="metric-value">${results.uniqueVotesProcessed || results.totalVotes || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Rejected Duplicates:</span>
            <span class="metric-value">${results.totalAttempts ? (results.totalAttempts - (results.uniqueVotesProcessed || results.totalVotes)) : 0}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Scalability Analysis</h2>
        
        <table>
          <tr>
            <th>Batch Size</th>
            <th>Throughput (votes/sec)</th>
            <th>Processing Time</th>
          </tr>
          <tr>
            <td>Small Batch</td>
            <td>${results.scalability?.smallBatch?.toFixed(2) || 0}</td>
            <td>${results.metrics?.batchSizes?.[0]?.duration || 0} ms</td>
          </tr>
          <tr>
            <td>Medium Batch</td>
            <td>${results.scalability?.mediumBatch?.toFixed(2) || 0}</td>
            <td>${results.metrics?.batchSizes?.[1]?.duration || 0} ms</td>
          </tr>
          <tr>
            <td>Large Batch</td>
            <td>${results.scalability?.largeBatch?.toFixed(2) || 0}</td>
            <td>${results.metrics?.batchSizes?.[2]?.duration || 0} ms</td>
          </tr>
        </table>
        
        <div class="box">
          <h3>Scalability Rating</h3>
          <div class="metric">
            <span class="metric-name">Rating:</span>
            <span class="metric-value rating rating-${scalabilityRating.label.toLowerCase()}">${scalabilityRating.label}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Scalability Ratio:</span>
            <span class="metric-value">${(results.scalability?.scalabilityRatio || 0).toFixed(2)}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Description:</span>
            <span class="metric-value">${scalabilityRating.description}</span>
          </div>
        </div>
      </div>

      ${bottlenecks.length > 0 ? `
      <div class="section">
        <h2>System Optimization Recommendations</h2>
        
        ${bottlenecks.map(bottleneck => `
          <div class="box">
            <h3>${bottleneck.component}</h3>
            <div class="metric">
              <span class="metric-name">Severity:</span>
              <span class="metric-value">${bottleneck.severity}</span>
            </div>
            <div class="metric">
              <span class="metric-name">Location:</span>
              <span class="metric-value">${bottleneck.location}</span>
            </div>
            <div class="metric">
              <span class="metric-name">Metrics:</span>
              <span class="metric-value">${bottleneck.metrics}</span>
            </div>
            <div class="metric">
              <span class="metric-name">Recommendation:</span>
              <span class="metric-value">${bottleneck.recommendation}</span>
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="footer">
        <p>This report was generated using the Blockchain Testing Dashboard.</p>
        <p>© ${new Date().getFullYear()} Blockchain Voting System</p>
      </div>
    </body>
    </html>
    `;
    
    //create a Blob with the HTML content
    const blob = new Blob([htmlContent], {type: 'text/html'});
    
    //create a download link and trigger the download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    //show feedback to user when the report is generated
    setActionFeedback({
      type: 'success',
      message: `Report generated and downloaded as ${filename}.html`
    });
  };

  //front end display of the testing dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Blockchain Testing Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshConnection}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <span className="animate-spin mr-2">⟳</span> Refreshing...
              </>
            ) : (
              <>Refresh Connection</>
            )}
          </button>
          <button
            onClick={() => toggleImplementationMode(!useMock)}
            className={`px-4 py-2 ${useMock ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded`}
          >
            {useMock ? 'Switch to Real' : 'Switch to Mock'}
          </button>
        </div>
      </div>
      
      {/* Pre-Test Checklist for Optimal Results */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">Pre-Test Checklist for Optimal Ratings</h3>
        <ul className="list-disc pl-5 text-blue-800 space-y-1 text-sm">
          <li>Close other browser tabs and applications to free up memory</li>
          <li>Always click "Clear Votes" before running a new test for accurate results</li>
          <li>For "Good" to "Excellent" ratings, try these vote counts:
            <ul className="list-circle pl-5 mt-1 space-y-1">
              <li><strong>50-100 votes:</strong> Quick tests with more optimistic ratings</li>
              <li><strong>500 votes:</strong> Balanced test showing realistic scalability</li>
              <li><strong>1000+ votes:</strong> Most consistent "Good" or "Excellent" ratings</li>
            </ul>
          </li>
          <li>After clearing votes, run the same test twice - the second run often shows better performance</li>
          <li>Wait 5-10 seconds between tests to allow memory to be released</li>
        </ul>
      </div>
      
      {actionFeedback && (
        <div 
          className={`mb-6 p-4 rounded-lg 
            ${actionFeedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
              'bg-red-100 text-red-800 border border-red-200'}`}
        >
          <p>{actionFeedback.message}</p>
        </div>
      )}
      
      {renderConnectionInfo()}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Mock Vote Generation</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blockchain Implementation Mode
          </label>
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => toggleImplementationMode(true)}
              className={`px-4 py-2 rounded ${
                useMock 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Mock Implementation
            </button>
            <button
              onClick={() => toggleImplementationMode(false)}
              className={`px-4 py-2 rounded ${
                !useMock 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Real Blockchain
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {useMock 
              ? 'Using mock implementation with localStorage for testing' 
              : 'Using real Hyperledger Fabric connection (requires network setup)'}
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Votes to Generate
          </label>
          <div className="flex space-x-4">
            <input
              type="number"
              value={voteCount}
              onChange={(e) => {
                //allow any positive number as long as it's an integer
                const value = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                setVoteCount(value);
              }}
              min="1"
              placeholder="Enter any number of votes"
              className="border border-gray-300 rounded px-3 py-2 w-48"
            />
            
            <button
              onClick={handleGenerateVotes}
              disabled={isGenerating || voteCount === '' || voteCount < 1}
              className={`px-4 py-2 rounded flex items-center ${
                isGenerating || voteCount === '' || voteCount < 1
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : "Generate Votes"}
            </button>
            
            <button
              onClick={handleClearData}
              disabled={clearingVotes || isGenerating}
              className={`px-4 py-2 rounded flex items-center ${
                clearingVotes || isGenerating
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {clearingVotes ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Clearing...
                </>
              ) : "Clear Votes"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Recommended test sizes: 50, 100, 500, 1000+ votes for different scalability results
          </p>
        </div>
        
        {votes && !actionFeedback && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">
              Successfully generated {votes.success} votes 
              ({votes.failed > 0 ? `${votes.failed} failed` : 'no failures'})
            </p>
          </div>
        )}
      </div>
      
      {renderPerformanceMetrics()}

      {/* Optimization Patterns Modal */}
      {showOptimizationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Optimization Patterns</h3>
              <button 
                onClick={() => setShowOptimizationModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bottlenecks.map((bottleneck, index) => {
                const pattern = getOptimizationPatterns(bottleneck);
                if (!pattern) return null;
                
                return (
                  <div 
                    key={index} 
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition duration-200"
                    onClick={() => setSelectedPattern(pattern)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{bottleneck.component}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        bottleneck.severity === 'high' ? 'bg-red-100 text-red-800' :
                        bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {bottleneck.severity.charAt(0).toUpperCase() + bottleneck.severity.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm mb-1">{pattern.description}</p>
                    <p className="text-xs text-gray-500">Target: {pattern.fileToModify}</p>
                  </div>
                );
              })}
            </div>
            
            {selectedPattern && (
              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{selectedPattern.description}</h4>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {selectedPattern.fileToModify}
                  </span>
                </div>
                <div className="p-4 bg-gray-800 text-gray-100 rounded overflow-auto max-h-80">
                  <pre className="text-sm">{selectedPattern.code}</pre>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  You can copy this code pattern and adapt it to your specific implementation in {selectedPattern.fileToModify}.
                </p>
              </div>
            )}
            
            {/* Add How to Use section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-semibold mb-3">How to Use Optimization Patterns</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Select a pattern from the grid above to view its code implementation</li>
                <li>Examine the pattern's approach to solving the specific performance issue</li>
                <li>Copy relevant parts of the pattern and adapt them to your codebase</li>
                <li>Apply optimizations incrementally, testing after each change</li>
                <li>Focus on high-severity optimizations first for maximum impact</li>
              </ol>
              <p className="mt-4 text-sm text-gray-600">
                These patterns are designed as templates that demonstrate optimization techniques.
                You may need to adapt them to your specific application architecture.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 