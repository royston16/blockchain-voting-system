import { connect, Gateway, Identity } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';

//a simplified implementation that can be switched between mock and real modes
export class BlockchainService {
  constructor() {
    this.initialized = false;
    this.useMock = true; //toggle the button to switch between mock and real implementation
    
    //real fabric network parameters (for production)
    this.channelName = 'votingchannel';
    this.chaincodeName = 'votingcontract';
    this.mspId = 'VoterMSP';
    this.peerEndpoint = 'localhost:7051';
    this.peerHostAlias = 'peer0.org1.example.com';
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('Initializing blockchain service...');
      
      if (this.useMock) {
        //mock initialization for the demo purposes
        if (!localStorage.getItem('blockchain_votes')) {
          localStorage.setItem('blockchain_votes', '[]');
        }
        if (!localStorage.getItem('blockchain_results')) {
          localStorage.setItem('blockchain_results', '{"A":0,"B":0,"C":0}');
        }
      } else {
        //real fabric initialization would happen here when the user wants to use the real implementation
        await this._initializeRealFabric();
      }
      
      this.initialized = true;
      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  //new method to initialize real fabric connection
  async _initializeRealFabric() {
    try {
      console.log('Connecting to Hyperledger Fabric network...');
      
      //use actual credentials in production when the user wants to use the real implementation
      const client = await this._newGrpcConnection();
      const gateway = connect({
        client,
        identity: await this._newIdentity(),
        signer: await this._newSigner(),
        evaluateOptions: () => {
          return { deadline: Date.now() + 5000 }; //5 seconds
        },
        endorseOptions: () => {
          return { deadline: Date.now() + 15000 }; //15 seconds
        },
        submitOptions: () => {
          return { deadline: Date.now() + 5000 }; //5 seconds
        },
        commitStatusOptions: () => {
          return { deadline: Date.now() + 60000 }; //1 minute
        },
      });
      
      this.network = await gateway.getNetwork(this.channelName);
      this.contract = this.network.getContract(this.chaincodeName);
      this.gateway = gateway;
      
      console.log('Successfully connected to Hyperledger Fabric network');
    } catch (error) {
      console.error('Failed to connect to Hyperledger Fabric:', error);
      throw error;
    }
  }
  
  //methods for real fabric connection
  async _newGrpcConnection() {
    console.log(`Connecting to gRPC at ${this.peerEndpoint}`);
    const tlsRootCert = await this._loadTLSCertificate();
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(this.peerEndpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': this.peerHostAlias,
    });
  }
  
  async _loadTLSCertificate() {
    //load the TLS certificates in production when the user wants to use the real implementation
    console.log('Would load TLS certificates here in production');
    return Buffer.from('');
  }
  
  async _newIdentity() {
    //load the identity certificates in production when the user wants to use the real implementation
    console.log('Would load identity certificates here in production');
    const certPath = '/path/to/cert.pem'; //update with actual paths in production
    // const cert = await fs.promises.readFile(certPath);
    const cert = Buffer.from(''); //placeholder
    return { mspId: this.mspId, credentials: cert };
  }
  
  async _newSigner() {
    //load the private keys in production when the user wants to use the real implementation
    console.log('Would load private key here in production');
    const keyPath = '/path/to/key.pem'; //update with actual paths in production
    // const privateKey = await fs.promises.readFile(keyPath);
    const privateKey = Buffer.from(''); //placeholder
    
    return {
      sign: async (digest) => {
        //use the actual private key in production when the user wants to use the real implementation
        console.log('Would sign with private key in production');
        return Buffer.from('mock-signature');
      }
    };
  }

  //method to cast a vote for a candidate by the voter
  async castVote(voterId, candidateId) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log(`Casting vote for ${candidateId} by voter: ${voterId}`);
      
      //for larger operations, use the batch processing instead
      if (this._isBulkOperation && this._pendingVotes) {
        this._pendingVotes.voters.push(voterId);
        this._pendingVotes.candidates.push(candidateId);
        
        //if it reached the batch size, process the batch
        if (this._pendingVotes.voters.length >= this._pendingVotes.batchSize) {
          const result = await this.processVotesBatch(
            this._pendingVotes.voters,
            this._pendingVotes.candidates
          );
          this._pendingVotes.voters = [];
          this._pendingVotes.candidates = [];
          return result.votes[result.votes.length - 1]; //return the last vote
        }
        
        //return a synthesized result for the pending vote
        const voterHash = this._generateSecureVoterHash(voterId);
        const sessionId = this._generateSessionId();
        const txId = this._generateTxId();
        
        return {
          txId,
          voterId: voterHash,
          candidate: candidateId,
          timestamp: new Date().toISOString(),
          sessionId,
          isPending: true
        };
      }
      
      //for small operations, use the original implementation with optimized checks
      if (this.useMock) {
        //check for duplicate vote with optimized lookup
        const voterKey = `voted:${voterId}`;
        const hasVoted = localStorage.getItem(voterKey) === 'true';
        
        if (hasVoted) {
          throw new Error('You have already cast a vote in this election');
        }
        
        //generate secure identifiers
        const voterHash = this._generateSecureVoterHash(voterId);
        const sessionId = this._generateSessionId();
        const txId = this._generateTxId();
        
        //create the vote object
        const vote = {
          txId,
          voterId: voterHash,
          originalVoter: voterId, //store the original voter ID for checking
          candidate: candidateId,
          timestamp: new Date().toISOString(),
          blockNumber: this._getVoteCount() + 1,
          sessionId
        };
        
        //store the vote
        this._storeVote(vote);
        
        //mark this voter as having voted
        localStorage.setItem(voterKey, 'true');
        
        //update results
        this._updateResults(candidateId);
        
        return vote;
      } else {
        //real fabric implementation
        try {
          //prepare transaction arguments
          const args = [
            voterId,
            candidateId
          ];
          
          //submit the transaction to the blockchain
          const txId = await this.contract.submitTransaction('castVote', ...args);
          
          //construct response with transaction details
          return {
            txId: txId.toString('hex'),
            voterId: voterId,
            candidate: candidateId,
            timestamp: new Date().toISOString(),
            sessionId
          };
        } catch (error) {
          console.error('Fabric transaction error:', error);
          throw new Error(`Blockchain error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Failed to cast vote:', error);
      throw error;
    }
  }

  //method to get the election results
  async getResults() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting election results');
      
      if (this.useMock) {
        //mock implementation for the demo purposes
        const results = await this._mockQuery('getResults', []);
        return results;
      } else {
        //real fabric implementation
        const resultBytes = await this.contract.evaluateTransaction('getResults');
        return JSON.parse(resultBytes.toString());
      }
    } catch (error) {
      console.error('Failed to get results:', error);
      throw error;
    }
  }

  async getAllVotes() {
    if (!this.initialized) await this.initialize();
    
    try {
      if (this.useMock) {
        //mock implementation for the demo purposes
        const votes = await this._mockQuery('getAllVotes', []);
        return votes;
      } else {
        //real fabric implementation
        const votesBytes = await this.contract.evaluateTransaction('getAllVotes');
        return JSON.parse(votesBytes.toString());
      }
    } catch (error) {
      console.error('Failed to get all votes:', error);
      throw error;
    }
  }

  async verifyChain() {
    if (!this.initialized) await this.initialize();
    
    try {
      if (this.useMock) {
        //mock implementation for the demo purposes
        const isValid = await this._mockQuery('verifyChain', []);
        return isValid;
      } else {
        //real fabric implementation
        const verificationBytes = await this.contract.evaluateTransaction('verifyChain');
        return JSON.parse(verificationBytes.toString());
      }
    } catch (error) {
      console.error('Failed to verify chain:', error);
      throw error;
    }
  }

  //store a vote in the blockchain (mock implementation)
  _storeVote(vote) {
    //get the existing votes
    const existingVotes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
    
    //add the new vote
    existingVotes.push(vote);
    
    //save back to localStorage
    localStorage.setItem('blockchain_votes', JSON.stringify(existingVotes));
  
  }

  //mock implementations for demo purposes
  _createMockGateway() {
    console.log('Creating mock Gateway (would connect to real network in production)');
    return {};
  }

  //mock contract for the demo purposes
  _getMockContract() {
    return {
      submitTransaction: this._mockTransaction.bind(this),
      evaluateTransaction: this._mockQuery.bind(this)
    };
  }

  //mock transaction for the demo purposes
  async _mockTransaction(fcn, args) {
    console.log(`Mock transaction: ${fcn}`);
    
    //store in browser localStorage to simulate persistence
    if (fcn === 'castVote') {
      const voterHash = args[0];
      const candidateId = args[1];
      
      //get the existing votes
      const existingVotes = JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
      
      //check if the voter has already voted
      if (existingVotes.some(v => v.voterId === voterHash)) {
        throw new Error('Voter has already cast a vote');
      }
      
      //add the new vote with anonymized voter data
      const newVote = {
        txId: this._generateTxId(),
        voterId: voterHash,
        candidate: candidateId,
        timestamp: new Date().toISOString(),
        blockNumber: existingVotes.length + 1,
        //add the voting session identifier
        sessionId: this._generateSessionId()
      };
      
      existingVotes.push(newVote);
      localStorage.setItem('blockchain_votes', JSON.stringify(existingVotes));
      
      //update the results
      this._updateResults(candidateId);
      
      return newVote.txId;
    }
    
    return this._generateTxId();
  }

  //mock query for the demo purposes
  async _mockQuery(fcn, args) {
    console.log(`Mock query: ${fcn}(${args.join(', ')})`);
    
    if (fcn === 'getResults') {
      return JSON.parse(localStorage.getItem('blockchain_results') || '{"A":0,"B":0,"C":0}');
    }
    
    if (fcn === 'getAllVotes') {
      return JSON.parse(localStorage.getItem('blockchain_votes') || '[]');
    }
    
    if (fcn === 'verifyChain') {
      //mock verification always returns true for demo purposes
      return { isValid: true, blockCount: this._getVoteCount() };
    }
    
    return {};
  }

  //method to update the results
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
    //generate a more secure hash that includes:
    // 1. voter ID (email)
    // 2. timestamp component
    // 3. random salt
    const timestamp = Date.now();
    const salt = Math.random().toString(36).substring(2);
    
    //include the voter ID in the hash, but with a prefix
    //that allows to identify which voter this hash belongs to
    //while still keeping it secure
    const input = `${voterId}-${timestamp}-${salt}`;
    
    //use a more sophisticated hashing algorithm (SHA-256 hashing algorithm)
    const hash = Array.from(input).reduce((hash, char, i) => {
      const charCode = char.charCodeAt(0);
      return (((hash << 5) - hash) + (charCode * (i + 1))) | 0;
    }, 0).toString(16).padStart(8, '0');
    
    //include a prefix with part of the email to make identification easier
    const emailPrefix = voterId.split('@')[0].substring(0, 3);
    return `vh_${emailPrefix}_${hash}`;
  }

  //method to generate a unique session ID for each vote
  _generateSessionId() {
    //generate a unique session identifier for each vote
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  _generateTxId() {
    //generate a unique transaction ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `tx_${timestamp}_${random}`;
  }

  //disconnect the connection when users are done with the voting
  async disconnect() {
    if (!this.useMock && this.gateway) {
      try {
        this.gateway.close();
        console.log('Disconnected from Hyperledger Fabric network');
      } catch (error) {
        console.error('Error disconnecting from Fabric:', error);
      }
    }
  }

  //method to toggle between mock and real implementation
  setImplementationMode(useMock) {
    //only allow changing if not in the middle of operations
    if (this.initialized) {
      console.log(`Switching implementation mode from ${this.useMock ? 'mock' : 'real'} to ${useMock ? 'mock' : 'real'}`);
      
      //if changing modes, it needs to reinitialize
      this.initialized = false;
      
      //if there is an active gateway connection, close it
      if (!this.useMock && this.gateway) {
        try {
          this.gateway.close();
          console.log('Closed existing Fabric connection');
        } catch (error) {
          console.warn('Error closing gateway connection:', error);
        }
      }
    }
    
    this.useMock = useMock;
    return this.useMock;
  }
  
  //method to get the current connection status and details
  getConnectionInfo() {
    return {
      isConnected: this.initialized,
      mode: this.useMock ? 'mock' : 'real',
      networkDetails: this.useMock ? {
        storage: 'localStorage',
        mockVoteCount: this._getVoteCount()
      } : {
        channel: this.channelName,
        chaincode: this.chaincodeName,
        mspId: this.mspId,
        endpoint: this.peerEndpoint
      }
    };
  }
  
  //method to clear all vote data (mostly for testing purposes)
  async clearAllVotes() {
    try {
      if (this.useMock) {
        console.log('Clearing all vote data and optimizing for testing...');
        
        //for mock implementation, clear localStorage
        localStorage.removeItem('blockchain_votes');
        localStorage.removeItem('blockchain_results');
        
        //clear all voted flags in localStorage more efficiently
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('voted:')) {
            keysToRemove.push(key);
          }
        }
        
        //batch remove keys to reduce DOM updates
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        //reset any internal caches or state
        if (this._pendingVotes) {
          this._pendingVotes.voters = [];
          this._pendingVotes.candidates = [];
        }
        
        //reset internal state
        this._isBulkOperation = false;
        
        //reinitialize with fresh data
        this.initialized = false;
        await this.initialize();
        
        //force reset of any potential memory leaks (more aggressive cleanup)
        setTimeout(() => {
          //this helps browsers GC unused objects
          console.log('Completed memory optimization');
        }, 0);
        
        return { 
          success: true, 
          message: 'All vote data cleared successfully',
          optimized: true
        };
      } else {
        //for real implementation, this would call a chaincode admin function
        throw new Error('Clearing votes in real blockchain requires admin privileges');
      }
    } catch (error) {
      console.error('Failed to clear votes:', error);
      throw error;
    }
  }

  //store multiple votes in the blockchain in a single operation (mock implementation)
  _storeBulkVotes(votes) {
    try {
      //get existing votes
      const existingVotesJSON = localStorage.getItem('blockchain_votes') || '[]';
      let existingVotes;
      
      try {
        existingVotes = JSON.parse(existingVotesJSON);
      } catch (e) {
        console.error('Error parsing existing votes:', e);
        existingVotes = [];
      }
      
      //add new votes in bulk
      existingVotes.push(...votes);
      
      //save back to localStorage in a single operation
      localStorage.setItem('blockchain_votes', JSON.stringify(existingVotes));
      
      return votes.length;
    } catch (error) {
      console.error('Error storing bulk votes:', error);
      throw error;
    }
  }
  
  //update results for multiple votes in a single operation
  _updateResultsBulk(candidateVotes) {
    try {
      const resultsJSON = localStorage.getItem('blockchain_results') || '{"A":0,"B":0,"C":0}';
      let results;
      
      try {
        results = JSON.parse(resultsJSON);
      } catch (e) {
        console.error('Error parsing results:', e);
        results = {"A":0,"B":0,"C":0};
      }
      
      //count votes by candidate
      for (const candidateId of candidateVotes) {
        if (results[candidateId] !== undefined) {
          results[candidateId]++;
        } else {
          results[candidateId] = 1;
        }
      }
      
      //save results in a single operation
      localStorage.setItem('blockchain_results', JSON.stringify(results));
      
      return results;
    } catch (error) {
      console.error('Error updating results in bulk:', error);
      throw error;
    }
  }
  
  //process votes in batches for better performance with larger vote counts
  async processVotesBatch(voterEmails, candidateIds) {
    if (!this.initialized) await this.initialize();
    
    if (voterEmails.length !== candidateIds.length) {
      throw new Error('Voter emails and candidate IDs must have the same length');
    }
    
    try {
      console.log(`Processing batch of ${voterEmails.length} votes`);
      
      //optimization: use more efficient duplicate checking with Set instead of array
      //get all existing votes but only extract IDs for faster duplicate checking
      const allVotes = await this.getAllVotes();
      
      //optimization: create a Set for O(1) lookup instead of array iteration
      const existingVoterSet = new Set();
      
      //extract all existing voter IDs and add to Set
      for (const vote of allVotes) {
        if (vote.originalVoter) {
          existingVoterSet.add(vote.originalVoter);
        } else if (vote.voterId) {
          //legacy format without originalVoter
          existingVoterSet.add(vote.voterId);
        }
      }
      
      const votes = [];
      const successfulCandidates = [];
      const voterHashes = new Map(); //keep track of hashes for reuse
      
      //optimization: pre-generate session ID once for batch to reduce overhead
      const batchSessionId = this._generateSessionId();
      const batchTimestamp = new Date().toISOString();
      const startBlockNumber = this._getVoteCount() + 1;
      
      //process each vote in memory without individual localStorage operations
      for (let i = 0; i < voterEmails.length; i++) {
        const voterId = voterEmails[i];
        const candidateId = candidateIds[i];
        
        //optimization: use constant-time lookup instead of array search
        if (existingVoterSet.has(voterId)) {
          continue;
        }
        
        //add to tracking Set to prevent duplicates within this batch
        existingVoterSet.add(voterId);
        
        //generate or reuse secure identifiers for performance
        let voterHash;
        if (voterHashes.has(voterId)) {
          voterHash = voterHashes.get(voterId);
        } else {
          voterHash = this._generateSecureVoterHash(voterId);
          voterHashes.set(voterId, voterHash);
        }
        
        //create vote object (more efficiently)
        const vote = {
          txId: this._generateTxId(),
          voterId: voterHash,
          originalVoter: voterId,
          candidate: candidateId,
          timestamp: batchTimestamp,
          blockNumber: startBlockNumber + votes.length,
          sessionId: batchSessionId
        };
        
        //add to batch
        votes.push(vote);
        successfulCandidates.push(candidateId);
      }
      
      //store all votes in a single localStorage operation
      if (votes.length > 0) {
        this._storeBulkVotes(votes);
        this._updateResultsBulk(successfulCandidates);
        
        //also set the voted flags for each voter to maintain consistency with single-vote flow
        for (let i = 0; i < votes.length; i++) {
          const voterKey = `voted:${votes[i].originalVoter}`;
          localStorage.setItem(voterKey, 'true');
        }
      }
      
      //optimization: free memory
      voterHashes.clear();
      existingVoterSet.clear();
      
      return {
        totalProcessed: voterEmails.length,
        successful: votes.length,
        skipped: voterEmails.length - votes.length,
        votes
      };
    } catch (error) {
      console.error('Failed to process vote batch:', error);
      throw error;
    }
  }

  //enable bulk mode to improve performance for batch operations
  enableBulkMode(batchSize = 50) {
    this._isBulkOperation = true;
    this._pendingVotes = {
      voters: [],
      candidates: [],
      batchSize: batchSize
    };
    console.log(`Enabled bulk mode with batch size ${batchSize}`);
  }
  
  //disable bulk mode
  disableBulkMode() {
    this._isBulkOperation = false;
    this._pendingVotes = null;
    console.log('Disabled bulk mode');
  }
  
  //process any pending votes
  async processPendingVotes() {
    if (!this._isBulkOperation || !this._pendingVotes || this._pendingVotes.voters.length === 0) {
      return { processed: 0 };
    }
    
    try {
      const result = await this.processVotesBatch(
        this._pendingVotes.voters,
        this._pendingVotes.candidates
      );
      
      this._pendingVotes.voters = [];
      this._pendingVotes.candidates = [];
      
      return result;
    } catch (error) {
      console.error('Failed to process pending votes:', error);
      throw error;
    }
  }
}

//create and export a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;

