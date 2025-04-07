import blockchainService from './fabric-gateway';

// Generate a random mock voter ID
const generateMockVoterId = (index) => {
  return `mock_voter_${Date.now()}_${index}`;
};

// Generate a random mock voter email
const generateMockEmail = (index) => {
  return `voter${index}@example.com`;
};

// Generate mock votes
export const generateMockVotes = async (count = 100) => {
  try {
    // Make sure blockchain is initialized
    await blockchainService.initialize();
    
    const candidates = ['A', 'B', 'C'];
    const results = {
      success: 0,
      failed: 0,
      votes: []
    };
    
    console.log(`Generating ${count} mock votes...`);
    
    for (let i = 0; i < count; i++) {
      try {
        // Generate unique voter data
        const mockVoterId = generateMockVoterId(i);
        const mockEmail = generateMockEmail(i);
        
        // Generate distribution to make results interesting (biased toward A slightly)
        let candidateIndex;
        const rand = Math.random();
        if (rand < 0.4) {
          candidateIndex = 0; // 40% chance for candidate A
        } else if (rand < 0.7) {
          candidateIndex = 1; // 30% chance for candidate B
        } else {
          candidateIndex = 2; // 30% chance for candidate C
        }
        
        const candidate = candidates[candidateIndex];
        
        // Cast vote
        const result = await blockchainService.castVote(mockEmail, candidate);
        
        results.success++;
        results.votes.push({
          ...result,
          email: mockEmail,
          candidate
        });
        
        // Add a small delay to simulate natural voting patterns and not overload the system
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Log progress every 10 votes
        if (i % 10 === 0) {
          console.log(`Generated ${i} votes so far...`);
        }
      } catch (error) {
        console.error(`Error generating mock vote #${i}:`, error);
        results.failed++;
      }
    }
    
    console.log('Mock vote generation completed:');
    console.log(`- Success: ${results.success}`);
    console.log(`- Failed: ${results.failed}`);
    
    return results;
  } catch (error) {
    console.error('Error generating mock votes:', error);
    throw error;
  }
};

// Analyze performance of the voting system
export const analyzePerformance = (results) => {
  if (!results || !results.votes || results.votes.length === 0) {
    return {
      averageResponseTime: 0,
      throughput: 0,
      successRate: 0
    };
  }
  
  // Calculate metrics
  const successRate = (results.success / (results.success + results.failed)) * 100;
  
  // In a real implementation, we'd measure actual response times
  // Here we're simulating it with random values between 100-500ms
  const simulatedResponseTimes = results.votes.map(() => Math.random() * 400 + 100);
  const averageResponseTime = simulatedResponseTimes.reduce((sum, time) => sum + time, 0) / simulatedResponseTimes.length;
  
  // Calculate throughput (votes per second)
  const throughput = 1000 / averageResponseTime;
  
  return {
    averageResponseTime: Math.round(averageResponseTime),
    throughput: throughput.toFixed(2),
    successRate: successRate.toFixed(1)
  };
}; 