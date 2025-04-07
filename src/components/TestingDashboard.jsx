import { useState } from 'react';
import { generateMockVotes, analyzePerformance } from '../blockchain/mockVoteGenerator';
import blockchainService from '../blockchain/fabric-gateway';

export default function TestingDashboard() {
  const [voteCount, setVoteCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  
  // Run the test to generate mock votes
  const handleRunTest = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    setPerformance(null);
    setDistribution(null);
    
    try {
      // Generate mock votes
      const testResults = await generateMockVotes(voteCount);
      setResults(testResults);
      
      // Calculate performance metrics
      const performanceData = analyzePerformance(testResults);
      setPerformance(performanceData);
      
      // Calculate vote distribution
      const blockchain = await blockchainService.getResults();
      setDistribution(blockchain);
    } catch (error) {
      console.error('Test failed:', error);
      setError(error.message || 'Failed to generate mock votes');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear test data
  const handleClearData = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we'd clear the blockchain
      // Here we're just clearing localStorage
      localStorage.removeItem('blockchain_votes');
      localStorage.removeItem('blockchain_results');
      
      setResults(null);
      setPerformance(null);
      setDistribution(null);
      
    } catch (error) {
      console.error('Failed to clear data:', error);
      setError(error.message || 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Testing Dashboard</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate Mock Votes</h2>
        <p className="mb-4 text-gray-600">
          Generate mock votes to test the blockchain voting system at scale. This will
          simulate an election with the specified number of votes.
        </p>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-full max-w-xs">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Number of votes to generate
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              className="w-full p-2 border rounded"
              value={voteCount}
              onChange={(e) => setVoteCount(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))}
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleRunTest}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Mock Votes'}
          </button>
          
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            onClick={handleClearData}
            disabled={loading}
          >
            Clear Test Data
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
      
      {results && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded">
              <div className="text-gray-600 text-sm">Total Votes</div>
              <div className="text-2xl font-bold">{results.success + results.failed}</div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <div className="text-gray-600 text-sm">Successful</div>
              <div className="text-2xl font-bold text-green-600">{results.success}</div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded">
              <div className="text-gray-600 text-sm">Failed</div>
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
            </div>
          </div>
          
          {performance && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-gray-600 text-sm">Average Response Time</div>
                  <div className="text-2xl font-bold">{performance.averageResponseTime} ms</div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-gray-600 text-sm">Throughput</div>
                  <div className="text-2xl font-bold">{performance.throughput} votes/sec</div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-gray-600 text-sm">Success Rate</div>
                  <div className="text-2xl font-bold">{performance.successRate}%</div>
                </div>
              </div>
            </div>
          )}
          
          {distribution && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Vote Distribution</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(distribution).map(([candidate, votes]) => (
                  <div key={candidate} className="bg-indigo-50 p-4 rounded">
                    <div className="text-gray-600 text-sm">Candidate {candidate}</div>
                    <div className="text-2xl font-bold">{votes} votes</div>
                    <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full" 
                        style={{ 
                          width: `${Object.values(distribution).reduce((sum, val) => sum + val, 0) > 0 
                            ? (votes / Object.values(distribution).reduce((sum, val) => sum + val, 0)) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {results && results.votes && results.votes.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Vote Samples</h2>
          <p className="mb-4 text-gray-600">
            Showing first 5 votes from the test (of {results.votes.length} total)
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vote #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email (Anonymized)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.votes.slice(0, 5).map((vote, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <code>{vote.txId}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.email.substring(0, 2)}***{vote.email.substring(vote.email.indexOf('@'))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vote.candidate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(vote.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 