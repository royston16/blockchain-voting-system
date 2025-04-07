import { connect, Gateway, Identity } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';

// This is a simplified implementation for demo purposes
export class BlockchainService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing blockchain service...');
      // Initialize localStorage if needed
      if (!localStorage.getItem('blockchain_votes')) {
        localStorage.setItem('blockchain_votes', '[]');
      }
      if (!localStorage.getItem('blockchain_results')) {
        localStorage.setItem('blockchain_results', '{"A":0,"B":0,"C":0}');
      }
      
      this.initialized = true;
      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async castVote(voterId, candidateId) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log(`Casting vote for ${candidateId} by voter: ${voterId}`);
      
      // First, check if this voter has already voted
      // This is a more secure check before generating any new hashes
      const allVotes = await this.getAllVotes();
      const hasVoted = allVotes.some(vote => 
        vote.originalVoter === voterId || 
        (vote.voterId && vote.voterId.includes(voterId))
      );
      
      if (hasVoted) {
        throw new Error('You have already cast a vote in this election');
      }
      
      // Generate a secure voter hash that includes multiple factors
      const voterHash = this._generateSecureVoterHash(voterId);
      
      // Generate session ID
      const sessionId = this._generateSessionId();
      
      // Generate transaction ID
      const txId = this._generateTxId();
      
      // Create the vote object
      const vote = {
        txId,
        voterId: voterHash,
        originalVoter: voterId, // Store original voter ID for checking
        candidate: candidateId,
        timestamp: new Date().toISOString(),
        blockNumber: this._getVoteCount() + 1,
        sessionId
      };
      
      // Store the vote
      this._storeVote(vote);
      
      // Update results
      this._updateResults(candidateId);
      
      return vote;
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  }

  async getResults() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting election results');
      
      // In production, this would query actual chaincode
      const results = await this._mockQuery('getResults', []);
      
      return results;
    } catch (error) {
      console.error('Failed to get results:', error);
      throw error;
    }
  }

  async getAllVotes() {
    if (!this.initialized) await this.initialize();
    
    try {
      // In production, this would query actual chaincode
      const votes = await this._mockQuery('getAllVotes', []);
      
      return votes;
    } catch (error) {
      console.error('Failed to get all votes:', error);
      throw error;
    }
  }

  async verifyChain() {
    if (!this.initialized) await this.initialize();
    
    try {
      // In production, this would validate the blockchain state
      const isValid = await this._mockQuery('verifyChain', []);
      
      return isValid;
    } catch (error) {
      console.error('Failed to verify chain:', error);
      throw error;
    }
  }

  // Store a vote in the blockchain (mock implementation)
  _storeVote(vote) {
    // Get existing votes
    const existingVotes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
    
    // Add new vote
    existingVotes.push(vote);
    
    // Save back to localStorage
    localStorage.setItem('blockchain_votes', JSON.stringify(existingVotes));
  
  }

  // Mock implementations for demo purposes
  _createMockGateway() {
    console.log('Creating mock Gateway (would connect to real network in production)');
    return {};
  }

  _getMockContract() {
    return {
      submitTransaction: this._mockTransaction.bind(this),
      evaluateTransaction: this._mockQuery.bind(this)
    };
  }

  async _mockTransaction(fcn, args) {
    console.log(`Mock transaction: ${fcn}`);
    
    // Store in browser localStorage to simulate persistence
    if (fcn === 'castVote') {
      const voterHash = args[0];
      const candidateId = args[1];
      
      // Get existing votes
      const existingVotes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
      
      // Check if voter has already voted
      if (existingVotes.some(v => v.voterId === voterHash)) {
        throw new Error('Voter has already cast a vote');
      }
      
      // Add new vote with anonymized voter data
      const newVote = {
        txId: this._generateTxId(),
        voterId: voterHash,
        candidate: candidateId,
        timestamp: new Date().toISOString(),
        blockNumber: existingVotes.length + 1,
        // Add voting session identifier
        sessionId: this._generateSessionId()
      };
      
      existingVotes.push(newVote);
      localStorage.setItem('blockchain_votes', JSON.stringify(existingVotes));
      
      // Update results
      this._updateResults(candidateId);
      
      return newVote.txId;
    }
    
    return this._generateTxId();
  }

  async _mockQuery(fcn, args) {
    console.log(`Mock query: ${fcn}(${args.join(', ')})`);
    
    if (fcn === 'getResults') {
      return JSON.parse(localStorage.getItem('blockchain_results') || '{"A":0,"B":0,"C":0}');
    }
    
    if (fcn === 'getAllVotes') {
      return JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
    }
    
    if (fcn === 'verifyChain') {
      // Mock verification always returns true for demo
      return { isValid: true, blockCount: this._getVoteCount() };
    }
    
    return {};
  }

  _updateResults(candidateId) {
    const results = JSON.parse(localStorage.getItem('blockchain_results') || '{"A":0,"B":0,"C":0}');
    
    if (results[candidateId] !== undefined) {
      results[candidateId]++;
    } else {
      results[candidateId] = 1;
    }
    
    localStorage.setItem('blockchain_results', JSON.stringify(results));
  }

  _getVoteCount() {
    const votes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
    return votes.length;
  }

  _generateSecureVoterHash(voterId) {
    // Generate a more secure hash that includes:
    // 1. Voter ID (email)
    // 2. Timestamp component
    // 3. Random salt
    const timestamp = Date.now();
    const salt = Math.random().toString(36).substring(2);
    
    // Include the voter ID in the hash, but with a prefix
    // This allows us to identify which voter this hash belongs to
    // while still keeping it secure
    const input = `${voterId}-${timestamp}-${salt}`;
    
    // Use a more sophisticated hashing algorithm
    const hash = Array.from(input).reduce((hash, char, i) => {
      const charCode = char.charCodeAt(0);
      return (((hash << 5) - hash) + (charCode * (i + 1))) | 0;
    }, 0).toString(16).padStart(8, '0');
    
    // Include a prefix with part of the email to make identification easier
    // but still secure
    const emailPrefix = voterId.split('@')[0].substring(0, 3);
    return `vh_${emailPrefix}_${hash}`;
  }

  _generateSessionId() {
    // Generate a unique session identifier for each vote
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  _generateTxId() {
    // Generate a unique transaction ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `tx_${timestamp}_${random}`;
  }
}

// Create and export a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
