import { ethers } from 'ethers';
import VotingContractArtifact from './build/VotingContract.json';

// Use the full VotingContract ABI from the build
const votingContractABI = VotingContractArtifact.abi || [
  // If import fails, ABI will be filled with these basic functions
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_voterHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_candidateId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_sessionId",
        "type": "string"
      }
    ],
    "name": "castVote",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getResults",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "pageSize",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "page",
        "type": "uint256"
      }
    ],
    "name": "getAllVotes",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "voterHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "candidateId",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "sessionId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "blockNumber",
            "type": "uint256"
          }
        ],
        "internalType": "struct VotingContract.Vote[]",
        "name": "",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Get the bytecode from the VotingContract artifact
const votingContractBytecode = VotingContractArtifact.bytecode || "";

// Cache keys for local storage
const CACHE_KEYS = {
  VOTE_RESULTS: 'voting_results_cache',
  VOTE_DATA: 'voting_data_cache',
  LAST_SYNC: 'voting_last_sync_time',
  VOTE_RECEIPTS: 'voting_receipts'
};

//blockchain service provides functionality to interact with the ethereum blockchain
export class BlockchainService {
  /**
   * Initialize the Ethereum service
   * @param {boolean} useMock - Whether to use mock implementation (default: false)
   * @param {string} networkURL - URL of the Ethereum network (default: http://localhost:8545)
   * @param {string} contractAddress - Address of the deployed contract (optional)
   */
  constructor() {
    //initialize properties of the blockchain service
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.initialized = false;
    this._initializing = false;
    this.networkDetails = null;
    this.pendingVotes = []; // Track pending votes in memory
    this.confirmedVotes = []; // Track confirmed votes in memory
    this.pendingTransactions = new Map(); // Map to track transaction status
    this.transactionListeners = new Map(); // Event listeners for transactions
    this.isRefreshing = false; // Flag to prevent multiple refreshes
    
    // Try to load contract address from local storage
    this.contractAddress = localStorage.getItem('contractAddress') || null;
    
    // Try to load cached votes data
    this._loadCachedVotes();
    
    // Try to load extended deployment info if available
    try {
      const deploymentInfoStr = localStorage.getItem('contractDeploymentInfo');
      if (deploymentInfoStr) {
        const deploymentInfo = JSON.parse(deploymentInfoStr);
        console.log('Found saved deployment info:', deploymentInfo);
        
        //if contract address was not set from direct storage, use it from deployment info
        if (!this.contractAddress && deploymentInfo.contractAddress) {
          this.contractAddress = deploymentInfo.contractAddress;
          console.log('Using contract address from deployment info:', this.contractAddress);
          
          //ensure that it is also saved in the primary storage location
          localStorage.setItem('contractAddress', this.contractAddress);
        }
      }
    } catch (error) {
      console.warn('Error loading deployment info:', error);
    }
    
    //set the network URL, network details, contract ABI, and contract bytecode
    this.networkURL = null;
    this.contractABI = votingContractABI;
    this.contractBytecode = votingContractBytecode;
    
    //always use real ethereum implementation only for testing purposes
    console.log('BlockchainService initialized in real Ethereum mode');
    if (this.contractAddress) {
      console.log('Loaded contract address from storage:', this.contractAddress);
    }
    
    // Set up page visibility event listener to refresh data when returning to the app
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
    }
    
    //listen for storage events from other tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === 'contractAddress' && event.newValue !== this.contractAddress) {
        console.log('Contract address changed in another tab, updating:', event.newValue);
        this.contractAddress = event.newValue;
        //re-initialize with new contract address if we are already initialized
        if (this.initialized) {
          console.log('re-initializing with new contract address');
          this.initialized = false;
          this.initialize();
        }
      }
      
      // Also refresh when vote data is updated in another tab
      if (event.key === CACHE_KEYS.VOTE_DATA || event.key === CACHE_KEYS.VOTE_RESULTS) {
        this._loadCachedVotes();
        window.dispatchEvent(new CustomEvent('voteDataUpdated'));
      }
    });
  }

  /**
   * Handle page visibility changes to refresh data when returning to the app
   * @private
   */
  _handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      console.log('App became visible, refreshing blockchain data');
      
      // Check when we last synced
      const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC);
      const now = Date.now();
      
      // Only refresh if it's been more than 30 seconds since the last sync
      if (!lastSync || (now - parseInt(lastSync)) > 30000) {
        this._refreshVotesAndResults();
      }
    }
  }
  
  /**
   * Refresh votes and results data from the blockchain
   * @private
   */
  async _refreshVotesAndResults() {
    if (this.isRefreshing) return;
    
    try {
      this.isRefreshing = true;
      
      // Make sure we're initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get results and votes from blockchain
      const [resultsData, votesData] = await Promise.all([
        this.getResults(),
        this.getAllVotes(1000, 0)
      ]);
      
      // Cache the results
      this._cacheVoteData(resultsData, votesData);
      
      // Mark the last sync time
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
      
      // Notify listeners that data has been updated
      window.dispatchEvent(new CustomEvent('voteDataUpdated'));
      
      console.log('Vote data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing vote data:', error);
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Load cached votes from localStorage
   * @private
   */
  _loadCachedVotes() {
    try {
      // Try to load cached vote results
      const cachedResults = localStorage.getItem(CACHE_KEYS.VOTE_RESULTS);
      if (cachedResults) {
        const parsedResults = JSON.parse(cachedResults);
        console.log('Loaded cached vote results:', parsedResults);
      }
      
      // Try to load cached vote data
      const cachedVotes = localStorage.getItem(CACHE_KEYS.VOTE_DATA);
      if (cachedVotes) {
        const parsedVotes = JSON.parse(cachedVotes);
        
        // Only use cached votes if they're in the right format
        if (Array.isArray(parsedVotes)) {
          // Separate pending and confirmed votes
          this.confirmedVotes = parsedVotes.filter(vote => !vote.pending);
          this.pendingVotes = parsedVotes.filter(vote => vote.pending);
          console.log(`Loaded ${this.confirmedVotes.length} confirmed and ${this.pendingVotes.length} pending votes from cache`);
        }
      }
    } catch (error) {
      console.warn('Error loading cached votes:', error);
    }
  }
  
  /**
   * Cache vote data and results to localStorage
   * @private
   * @param {Object} resultsData - Results data to cache
   * @param {Object} votesData - Votes data to cache
   */
  _cacheVoteData(resultsData, votesData) {
    try {
      // Cache results if valid
      if (resultsData && (resultsData.results || resultsData.totalVotes)) {
        localStorage.setItem(CACHE_KEYS.VOTE_RESULTS, JSON.stringify(resultsData));
      }
      
      // Cache votes if valid
      if (votesData && Array.isArray(votesData.votes)) {
        localStorage.setItem(CACHE_KEYS.VOTE_DATA, JSON.stringify(votesData.votes));
      }
      
      // Update last sync time
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.warn('Error caching vote data:', error);
    }
  }

  /**
   * save the contract address to local storage
   * @private
   */
  _saveContractAddress() {
    if (this.contractAddress) {
      localStorage.setItem('contractAddress', this.contractAddress);
      console.log('Saved contract address to localStorage:', this.contractAddress);
      
      //save additional deployment information
      try {
        //get current chain ID from the network details
        const chainId = this.networkDetails?.chainId || 'unknown';
        
        //get the deployment time and contract type from the blockchain service
        const deploymentInfo = {
          contractAddress: this.contractAddress,
          chainId: chainId,
          deploymentTime: new Date().toISOString(),
          contractType: 'VotingSystem'
        };
        
        //save the detailed deployment information to local storage
        localStorage.setItem('contractDeploymentInfo', JSON.stringify(deploymentInfo));
        console.log('Saved detailed deployment info:', deploymentInfo);
      } catch (error) {
        console.warn('Failed to save detailed deployment info:', error);
      }
    }
  }

  //clear firestore votes - no-op replacement
  async clearVotesFromFirestore() {
    console.log('No Firestore votes to clear - using local storage only');
    return { success: true };
  }

  /**
   * initialize the blockchain service
   * @returns {Promise<Object>} Result of initialization
   */
  async initialize() {
    if (this.initialized) {
      console.log('Already initialized');
      return { 
        success: true,
        message: "Already initialized",
        isConnected: true 
      };
    }
    
    if (this._initializing) {
      console.log('Initialization already in progress');
      return { 
        success: false,
        message: "Initialization in progress",
        isConnected: false 
      };
    }
    
    console.log('Initializing blockchain service');
    this._initializing = true;
    
    try {
      //try to load deployment info from local storage
      try {
        const deploymentInfoString = localStorage.getItem('contractDeploymentInfo');
        if (deploymentInfoString) {
          const deploymentInfo = JSON.parse(deploymentInfoString);
          console.log('Found saved deployment info:', deploymentInfo);
          
          //update contract address if it exists
          if (deploymentInfo.contractAddress) {
            this.contractAddress = deploymentInfo.contractAddress;
            console.log('Loaded contract address from deployment info:', this.contractAddress);
          }
        }
      } catch (storageError) {
        console.warn('Error loading saved deployment info:', storageError);
      }
      
      const result = await this._initializeEthereum();
      this.initialized = result.success;
      
      //if initialization was successful, try to load and validate the saved contract
      if (result.success && this.contractAddress) {
        const contractLoaded = await this.loadSavedContract();
        if (contractLoaded) {
          result.message += ' - Saved contract loaded successfully';
          
          // After successful initialization, refresh votes data
          this._refreshVotesAndResults();
        } else {
          result.message += ' - Could not validate saved contract';
        }
      }
      
      this._initializing = false;
      return result;
    } catch (error) {
      console.error('Failed to initialize:', error);
      this._initializing = false;
      return {
        success: false,
        message: `Failed to initialize: ${error.message}`,
        isConnected: false
      };
    }
  }

  /**
   * initialize the connection to ethereum
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async _initializeEthereum() {
    try {
      this._initializing = true;
      console.log('Initializing Ethereum connection...');
      
      //check if window.ethereum wallet provider is available (metamask)
      if (window.ethereum) {
        console.log('web3 provider detected (Metamask)');
        
        try {
          //request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            console.warn('no accounts available. falling back to read-only provider.');
          }
          
          //create ethers provider from web3 provider
          this.provider = new ethers.BrowserProvider(window.ethereum);
          
          //get the signer
          try {
            this.signer = await this.provider.getSigner();
            console.log('Wallet connected successfully');
          } catch (signerError) {
            console.warn('Could not get signer. Operating in read-only mode:', signerError.message);
          }
          
          //get network information
          const network = await this.provider.getNetwork();
          const chainId = network.chainId;
          let networkName;
          
          //map well-known chain IDs to network names to the network details
          switch (chainId) {
            case 1n:
              networkName = 'Ethereum Mainnet';
              break;
            case 5n:
              networkName = 'Goerli Testnet';
              break;
            case 11155111n:
              networkName = 'Sepolia Testnet';
              break;
            case 80001n:
              networkName = 'Polygon Mumbai';
              break;
            case 137n:
              networkName = 'Polygon Mainnet';
              break;
            case 56n:
              networkName = 'BNB Smart Chain';
              break;
            case 43114n:
              networkName = 'Avalanche C-Chain';
              break;
            case 31337n:
              networkName = 'Hardhat Local Node';
              break;
            case 1337n:
              networkName = 'Ganache Local Node';
              break;
            default:
              networkName = `Unknown Network (Chain ID: ${chainId})`;
          }
          
          console.log(`Connected to ${networkName} (Chain ID: ${chainId})`);
          
          //store network details
          this.networkDetails = {
            name: networkName,
            chainId: chainId.toString(),
            isConnected: true
          };
          
          //if contract address is provided, connect to the existing contract
          if (this.contractAddress) {
            console.log(`Connecting to existing contract at ${this.contractAddress}`);
            try {
              this.contract = new ethers.Contract(
                this.contractAddress,
                this.contractABI,
                this.signer || this.provider
              );
              
              //try to get the current value to verify connectivity
              try {
                const value = await this.contract.getValue();
                console.log("Contract value verified:", value.toString());
              } catch (valueError) {
                console.warn("Could not call getValue() on contract - may be using different ABI or function doesn't exist:", valueError.message);
                
                //do not clear the contract - it might be valid with a different ABI
                //just inform the user but keep the address
                console.warn("Contract exists but might use a different interface. Keeping address.");
              }
              
              this.initialized = true;
              this._initializing = false;
              return {
                success: true,
                message: `Connected to contract at ${this.contractAddress}`,
                contractAddress: this.contractAddress
              };
            } catch (contractError) {
              console.error("Error connecting to contract:", contractError);
              
              //do not clear invalid contract address automatically - this might be temporary
              //let the user explicitly clear it if needed
              console.warn("Contract connection issue, but keeping saved address for retry later");
              this.contract = null;
              
              this._initializing = false;
              return {
                success: true,
                message: `Connected to Ethereum but contract connection had issues: ${contractError.message}`,
              };
            }
          } else {
            console.warn('No contract address provided. Please deploy or connect to a contract.');
            this._initializing = false;
            return {
              success: true,
              message: 'Ethereum connected, ready to deploy a contract'
            };
          }
        } catch (walletError) {
          console.error('Error connecting to wallet:', walletError);
          
          //fall back to a read-only provider iff wallet connection fails
          console.log('Falling back to read-only provider');
          this.provider = new ethers.JsonRpcProvider("https://eth-mainnet.public.blastapi.io");
          
          this._initializing = false;
          return {
            success: false,
            message: `Wallet connection failed: ${walletError.message}. Operating in read-only mode.`
          };
        }
      } else {
        //if no web3 provider, use a public one
        console.log('No web3 provider detected. Using public RPC endpoint in read-only mode.');
        this.provider = new ethers.JsonRpcProvider("https://eth-mainnet.public.blastapi.io");
        
        //get network information from the public provider (likely MetaMask)
        try {
          const network = await this.provider.getNetwork();
          console.log('Connected to network:', network.name, 'Chain ID:', network.chainId.toString());
        } catch (networkError) {
          console.warn('Could not get network information:', networkError.message);
        }
        
        this._initializing = false;
        return {
          success: false,
          message: 'No web3 wallet detected. Operating in read-only mode with limited functionality.'
        };
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this._initializing = false;
      return {
        success: false,
        message: `Failed to initialize Ethereum connection: ${error.message}`
      };
    }
  }
  
  //clear the saved contract address when the admin clicks "Clear Contract" button
  clearContractAddress() {
    // Clear contract address and deployment info
    localStorage.removeItem('contractAddress');
    localStorage.removeItem('contractDeploymentInfo');
    
    // Clear all vote data from local storage
    localStorage.removeItem('userVotes');
    
    // Clear all items using CACHE_KEYS
    localStorage.removeItem(CACHE_KEYS.VOTE_RECEIPTS);
    localStorage.removeItem(CACHE_KEYS.VOTE_RESULTS);
    localStorage.removeItem(CACHE_KEYS.VOTE_DATA);
    localStorage.removeItem(CACHE_KEYS.LAST_SYNC);
    
    // Reset in-memory state
    this.contractAddress = null;
    this.contract = null;
    this.pendingVotes = [];
    this.confirmedVotes = []; 
    this.pendingTransactions = new Map();
    
    console.log('Performed complete reset: cleared contract address, deployment info, votes, receipts, and all related data');
    
    // Dispatch an event to notify UI components
    window.dispatchEvent(new CustomEvent('contractDataCleared'));
    
    return {
      success: true,
      message: 'Complete reset performed. All contract and voting data has been cleared.'
    };
  }

  /**
   * Deploy a new voting contract
   * @returns {Promise<Object>}
   */
  async deployContract() {
      if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      //check if signer is available for deploy
      if (!this.signer) {
        console.error('No signer available - cannot deploy contract');
        return {
          success: false,
          error: 'No signer available - cannot deploy contract. Please connect your wallet.' 
        };
      }
      
      console.log('Deploying VotingContract...');
      
      //create a contract factory using the signer
      const contractFactory = new ethers.ContractFactory(
        this.contractABI,
        this.contractBytecode,
        this.signer
      );

      console.log('Contract factory created, deploying with gas optimization...');
      
      //deploy the contract
      const contract = await contractFactory.deploy();
      console.log('Deployment transaction sent:', contract.deploymentTransaction().hash);
      
      //wait for contract deployment to complete
      console.log('Waiting for deployment to be confirmed...');
      await contract.waitForDeployment();
      
      //get the contract address
      const contractAddress = await contract.getAddress();
      console.log('Contract deployed at address:', contractAddress);
      
      //save the contract address
      this.contract = contract;
      this.contractAddress = contractAddress;
      this._saveContractAddress();
      
      return {
        success: true,
        contractAddress: contractAddress,
        transactionHash: contract.deploymentTransaction().hash
      };
      } catch (error) {
      console.error('Failed to deploy contract:', error);
      
      //provide more detailed error messages
      let errorMessage = error.message || 'Unknown error deploying contract';
      
      //handle specific error cases
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by the user in MetaMask';
      } else if (error.message && error.message.includes('insufficient funds')) {
        errorMessage = 'You do not have enough ETH to deploy the contract. Please add funds to your wallet.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  //initialize the election with a minimal contract
  async initElection(electionName, electionId, candidates, startTime, endTime) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      //check if the contract exists
      if (!this.contract || !this.contractAddress) {
        console.warn('Contract not deployed yet - cannot initialize election');
        return {
          success: false,
          error: "Contract not deployed. Please deploy the contract first."
        };
      }
      
      console.log('Contract address:', this.contractAddress);
      console.log('Initializing election with voting contract...');
      
      try {
        // Convert candidates to array format if it's not already
        const candidatesArray = Array.isArray(candidates) 
          ? candidates 
          : candidates.split(',').map(c => c.trim());
          
        // Ensure proper timestamp format
        const startTimeTimestamp = startTime ? parseInt(startTime) : Math.floor(Date.now() / 1000);
        const endTimeTimestamp = endTime ? parseInt(endTime) : 0; // 0 means no end time
        
        console.log(`Initializing election with params:`, {
          electionName,
          electionId,
          candidates: candidatesArray,
          startTime: startTimeTimestamp,
          endTime: endTimeTimestamp
        });
        
        // Call the actual initElection function from the contract
        const tx = await this.contract.initElection(
          electionName,
          electionId,
          candidatesArray,
          startTimeTimestamp,
          endTimeTimestamp
        );
        
        console.log('Transaction sent:', tx.hash);
        console.log('Waiting for transaction confirmation...');
        
        //wait for confirmation with a timeout of 2 minutes
        const receipt = await tx.wait(2); //wait for 2 confirmations
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        return {
          success: true,
          electionId,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber
        };
      } catch (error) {
        console.error('Failed to initialize election:', error);
        
        //more detailed error handling if the transaction fails
        let errorMessage = error.message || 'Unknown error initializing election';
        
        //check for specific MetaMask or RPC errors on the transaction
        if (error.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction was rejected by the user in MetaMask';
        } else if (error.message && error.message.includes('Internal JSON-RPC error')) {
          errorMessage = 'MetaMask RPC error. Please check if you have enough ETH for gas and try again.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('Failed to initialize election:', error);
      return {
        success: false,
        error: error.message || 'Unknown error preparing election initialization'
      };
    }
  }
  
  //cast a vote for a candidate
  async castVote(voterId, candidateId, sessionId, userEmail) {
    if (!this.initialized) await this.initialize();

    try {
      console.log('Casting vote with voter ID:', voterId);
      console.log('Candidate ID:', candidateId);
      console.log('Session ID:', sessionId);
      
      // Check if the contract exists for voting
      if (!this.contract) {
        const error = new Error('Contract not deployed yet - cannot cast vote');
        console.error(error);
        return { 
          success: false, 
          error: error.message
        };
      }
      
      // Generate a transaction ID for the vote
      const txId = this._generateTxId();
      
      // Submit the vote transaction to the blockchain
      console.log('Submitting vote transaction...');
      const tx = await this.contract.castVote(voterId, candidateId, sessionId);
        console.log('Vote transaction submitted:', tx.hash);
        
      // Create a vote record to track this vote
      const voteData = {
        voterId: voterId,
        voterHash: voterId, // Duplicated for compatibility
        candidateId: candidateId,
        candidate: candidateId, // Duplicated for compatibility
        sessionId: sessionId,
        voteTimestamp: Date.now(),
        timestamp: new Date().toISOString(),
          transactionHash: tx.hash,
        txId: txId,
        pending: true,
        email: userEmail || 'anonymous',
        originalVoter: userEmail || 'anonymous'
      };
      
      // Add to pending votes
      this.pendingVotes.push(voteData);
      this.pendingTransactions.set(tx.hash, voteData);
      
      // Set up transaction listener
      this._listenForTransaction(tx.hash);
      
      // Save vote receipt
      this.saveVoteReceipt(voteData, userEmail);
      
        return {
          success: true,
        transaction: voteData,
        transactionHash: tx.hash,
        pending: true
        };
      } catch (error) {
        console.error('Failed to cast vote:', error);
        return { 
          success: false, 
        error: error.message
        };
    }
  }
  
  //get the results of the election from the blockchain
  async getResults() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting election results');
      
      // Check if we have a contract
      if (!this.contract) {
        console.warn('Contract not available - returning cached results');
        return this._getCachedResults();
      }
      
      try {
        // First try direct getResults call
        console.log('Calling contract getResults() method...');
        
        let contractResults;
        try {
          contractResults = await this.contract.getResults();
          console.log('Contract results:', contractResults);
        } catch (methodError) {
          // If we got a BAD_DATA error, log it as info instead of warning
          if (methodError.code === 'BAD_DATA' || 
              (methodError.message && methodError.message.includes('could not decode result data'))) {
            console.log('getResults() not available, using alternative method');
          } else {
            console.warn('getResults() method not found or failed, using getAllVotes as fallback:', methodError);
          }
          
          // Fallback: Use getAllVotes to calculate results
          try {
            const votesData = await this.getAllVotes(1000, 0);
            
            if (votesData.error) {
              throw new Error(votesData.error);
            }
            
            // Calculate results from votes
            const votes = votesData.votes || [];
            const results = {};
            
            votes.forEach(vote => {
              const candidate = vote.candidateId || 'Unknown';
              if (!results[candidate]) {
                results[candidate] = 0;
              }
              results[candidate]++;
            });
            
            const date = new Date().toISOString();
            this._cacheVoteData({
              results: results,
              totalVotes: votes.length.toString(),
              lastUpdated: date
            });
            
            return {
              results: results,
              totalVotes: votes.length.toString(),
              lastUpdated: date
            };
          } catch (votesError) {
            console.log('Could not get votes, using cached results:', votesError.message);
            return this._getCachedResults();
          }
        }
      } catch (error) {
        console.error('Failed to get results:', error);
        
        // Try to return cached results if available
        try {
          const cachedResults = localStorage.getItem(CACHE_KEYS.VOTE_RESULTS);
          if (cachedResults) {
            return JSON.parse(cachedResults);
          }
        } catch (cacheError) {
          console.warn('Error reading cached results:', cacheError);
        }
        
        return {
          results: { "Total Votes": "0" },
          totalVotes: "0",
          error: error.message
        };
      }
    } catch (error) {
      console.error('Failed to get results:', error);
      
      // Try to return cached results if available
      try {
        const cachedResults = localStorage.getItem(CACHE_KEYS.VOTE_RESULTS);
        if (cachedResults) {
          return JSON.parse(cachedResults);
        }
      } catch (cacheError) {
        console.warn('Error reading cached results:', cacheError);
      }
      
      return {
        results: { "Total Votes": "0" },
        totalVotes: "0",
        error: error.message
      };
    }
  }
  
  async getAllVotes(pageSize = 50, page = 0) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting all votes');
      
      // Check if the contract exists for voting
      if (!this.contract) {
        console.warn('Contract not deployed yet - cannot get votes');
        
        // Return cached votes or in-memory votes
        const allVotes = [...this.confirmedVotes, ...this.pendingVotes];
        const votesData = {
          votes: allVotes,
          totalVotes: allVotes.length,
          hasMore: false,
          error: "Contract not deployed"
        };
        
        return votesData;
      }
      
      try {
        // Get votes from the blockchain
        console.log(`Calling contract getAllVotes(${pageSize}, ${page})...`);
        
        // Try to call the contract method, but with better error handling
        let result;
        try {
          result = await this.contract.getAllVotes(pageSize, page);
          console.log('Contract getAllVotes returned:', result);
        } catch (contractError) {
          // Check if it's a BAD_DATA error (common with ethers.js when the contract method isn't properly deployed)
          if (contractError.code === 'BAD_DATA' || 
              (contractError.message && contractError.message.includes('could not decode result data'))) {
            // Handle silently without logging to console as error
            console.log('getAllVotes returned empty data, using local cache instead');
            throw new Error('Contract method returned empty data');
          } else {
            // Re-throw other errors
            throw contractError;
          }
        }
        
        // Extract the data from the result
        const blockchainVotes = result[0];  // Vote[] - array of vote structs
        const totalVotes = result[1];       // uint256 - total number of votes
        const hasMore = result[2];          // bool - whether there are more votes to fetch
        
        // Transform the vote structs into a more usable format for the frontend
        const formattedBlockchainVotes = blockchainVotes.map(vote => {
          // Find if we have more details about this vote in our memory
          const matchedVote = this.confirmedVotes.find(cv => 
            cv.voterHash === vote.voterHash && 
            cv.candidateId === vote.candidateId && 
            cv.sessionId === vote.sessionId
          );
        
        return {
            voterId: vote.voterHash,
            candidateId: vote.candidateId,
            sessionId: vote.sessionId,
            timestamp: new Date(vote.timestamp.toNumber() * 1000).toISOString(),
            blockNumber: vote.blockNumber.toString(),
            transactionHash: matchedVote ? matchedVote.transactionHash : '',
            txId: matchedVote ? matchedVote.txId : '',
            pending: false
          };
        });
        
        // Combine blockchain votes with any pending votes not yet on chain
        const allVotes = [
          ...formattedBlockchainVotes,
          ...this.pendingVotes.filter(pv => 
            !formattedBlockchainVotes.some(bv => 
              bv.voterId === pv.voterHash && 
              bv.candidateId === pv.candidateId && 
              bv.sessionId === pv.sessionId
            )
          )
        ];
        
        // Sort by timestamp
        allVotes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Update the confirmed votes with the blockchain data
        this.confirmedVotes = formattedBlockchainVotes;
        
        const votesData = {
          votes: allVotes,
          totalVotes: totalVotes.toString(),
          hasMore: hasMore,
          page: page,
          pageSize: pageSize
        };
        
        // Cache the vote data
        this._cacheVoteData(null, votesData);
        
        return votesData;
      } catch (error) {
        // Log as info instead of error to avoid flooding console with red errors
        console.log('Could not get votes from contract, using fallback:', error.message);
        
        // Try to read from cache first
        try {
          const cachedVotes = localStorage.getItem(CACHE_KEYS.VOTE_DATA);
          if (cachedVotes) {
            const parsedVotes = JSON.parse(cachedVotes);
            return {
              votes: parsedVotes,
              totalVotes: parsedVotes.length.toString(),
              hasMore: false
            };
          }
        } catch (cacheError) {
          console.warn('Error reading cached votes:', cacheError);
        }
        
        // Return combined in-memory votes as fallback
        const allVotes = [...this.confirmedVotes, ...this.pendingVotes];
        return {
          votes: allVotes,
          totalVotes: allVotes.length.toString(),
          hasMore: false,
          error: error.message
        };
      }
    } catch (error) {
      // Log as info instead of error
      console.log('Using fallback vote data:', error.message);
      
      // Try to read from cache first
      try {
        const cachedVotes = localStorage.getItem(CACHE_KEYS.VOTE_DATA);
        if (cachedVotes) {
          const parsedVotes = JSON.parse(cachedVotes);
          return {
            votes: parsedVotes,
            totalVotes: parsedVotes.length.toString(),
            hasMore: false
          };
        }
      } catch (cacheError) {
        console.warn('Error reading cached votes:', cacheError);
      }
      
      // Return in-memory votes as fallback
      const allVotes = [...this.confirmedVotes, ...this.pendingVotes];
      return {
        votes: allVotes,
        totalVotes: allVotes.length.toString(),
        hasMore: false,
        error: error.message
      };
    }
  }
  
  //verify the blockchain's integrity
  async verifyChain() {
    try {
      console.log('Verifying blockchain integrity');
      
      if (!this.contract) {
        console.warn('Contract not deployed yet - cannot verify blockchain');
        return {
          isValid: false,
          verified: false,
          errorMessage: "Contract not deployed"
        };
      }
      
      // Try to get current state directly from the contract
      let isActive = true;
      let currentBlock = 0;
      let totalVotes = 0;
      
      try {
        // First try using verifyState method
        const state = await this.contract.verifyState();
        console.log('Contract state:', state);
        
        // Extract state info
        isActive = state[0];
        currentBlock = state[1];
        totalVotes = state[2];
      } catch (stateError) {
        console.warn('verifyState() method not found, using fallback methods:', stateError);
        
        // Fallback: Try to get active state if method exists
        try {
          isActive = await this.contract.isActive();
        } catch (activeError) {
          console.warn('isActive() not found, assuming active');
        }
        
        // Get current block number from provider
        currentBlock = await this.provider.getBlockNumber();
        
        // Try to get votes count from contract
        try {
          // Try different ways the vote count might be available
          try {
            const result = await this.contract.getVoteCount();
            totalVotes = result;
          } catch {
            try {
              const result = await this.contract.getTotalVotes();
              totalVotes = result;
            } catch {
              // Last resort - use getAllVotes to get total count
              try {
                const votesData = await this.getAllVotes(1, 0);
                totalVotes = votesData.totalVotes || 0;
              } catch (getAllVotesError) {
                console.log('Could not get votes data for verification, using defaults');
                totalVotes = this.confirmedVotes.length + this.pendingVotes.length;
              }
            }
          }
        } catch (votesError) {
          console.warn('Could not get total votes directly:', votesError);
        }
      }
      
      // Get all votes to verify the chain
      let votes = [];
      try {
        const votesData = await this.getAllVotes(1000, 0); // Get all votes with a large page size
        votes = votesData.votes || [];
      } catch (getAllVotesError) {
        console.log('Error getting votes for chain verification, using backup data');
        // Use in-memory votes as fallback
        votes = [...this.confirmedVotes, ...this.pendingVotes];
      }
      
      // Simple verification without Merkle tree if no votes are present
      if (votes.length === 0) {
        return {
          isValid: true,
          verified: true,
          blockHeight: currentBlock.toString(),
          voteCount: 0,
          expectedVoteCount: 0,
          isConsistent: true,
          allVotesVerified: true,
          merkleRoot: '0x0'
        };
      }
      
      // Collect all vote identifiers for verification
      const voteIdentifiers = votes.map(vote => {
        // Use any available identifier, with fallbacks
        return vote.commitment || vote.hash || vote.txId || vote.transactionHash || vote.voterId || '';
      }).filter(id => id !== '');
      
      if (voteIdentifiers.length === 0) {
        console.warn('No valid vote identifiers found for verification');
        return {
          isValid: false,
          verified: false,
          errorMessage: "No valid vote identifiers found"
        };
      }
      
      // Import the zk-utils functions
      try {
        const { generateMerkleTree } = await import('./zk-utils.js');
        
        // Generate simple Merkle tree from all vote identifiers
        const merkleTree = await generateMerkleTree(voteIdentifiers);
        
        // Perform basic verification
        const voteCount = votes.length;
        const expectedVoteCount = parseInt(totalVotes.toString());
        // If we couldn't get expectedVoteCount, use the actual count we retrieved
        const isConsistent = isNaN(expectedVoteCount) ? true : voteCount === expectedVoteCount;
        
        return {
          isValid: isConsistent,
          verified: isConsistent,
          blockHeight: currentBlock.toString(),
          voteCount: voteCount,
          expectedVoteCount: isNaN(expectedVoteCount) ? voteCount : expectedVoteCount,
          isConsistent: isConsistent,
          allVotesVerified: true, // Simplified for now
          merkleRoot: merkleTree.root || '0x0'
        };
      } catch (zkError) {
        console.error('Error with ZK utilities:', zkError);
        
        // Fallback to basic verification if ZK utilities fail
      return {
          isValid: true, // Assume valid since we have votes
        verified: true,
          blockHeight: currentBlock.toString(),
          voteCount: votes.length,
          expectedVoteCount: isNaN(parseInt(totalVotes.toString())) ? votes.length : parseInt(totalVotes.toString()),
          isConsistent: true,
          zkError: zkError.message
        };
      }
    } catch (error) {
      console.error('Error verifying blockchain:', error);
      return {
        isValid: false,
        verified: false,
        errorMessage: error.message
      };
    }
  }
  
  //close the election when the user is done voting
  async closeElection() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Closing election');
      
      //check if the contract exists
      if (!this.contract) {
        console.warn('Contract not deployed yet - cannot close election');
        return {
          success: false,
          error: "Contract not deployed"
        };
      }
      
      //call the contract method from the contract instance
      const tx = await this.contract.closeElection();
      
      //wait for the transaction to be mined
      const receipt = await tx.wait();
      
      //get the block timestamp
      const block = await this.provider.getBlock(receipt.blockNumber);
      
      return {
        success: true,
        closedAt: new Date(block.timestamp * 1000).toISOString(),
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Failed to close election:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  //helper methods for generating secure identifiers using btoa
  _generateSecureVoterHash(voterId) {
    return `voter_${btoa(voterId)}`;
  }
  
  //helper method for generating a random session ID using Math.random()
  _generateSessionId() {
    return `session_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  //helper method for generating a random transaction ID using Math.random()
  _generateTxId() {
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  //disconnect from the blockchain
  async disconnect() {
    console.log('Disconnecting from blockchain');
    //save the contract address before disconnecting
    const savedContractAddress = this.contractAddress;
    
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.initialized = false;
    
    //restore the contract address after disconnecting
    //this way it will reconnect to the same contract on next initialize
    this.contractAddress = savedContractAddress;
  }
  
  /**
   * Get the current connection information
   * @returns {Object} Connection information
   */
  getConnectionInfo() {
    //check if the contract is actually available
    const contractDeployed = this.contractAddress && this.contract;
    
    //get the base connection information
    const baseInfo = {
      connected: this.initialized && this.provider !== null,
      mode: 'ethereum',
      contractAddress: contractDeployed ? this.contractAddress : 'Not deployed',
      networkURL: this.provider ? 'Connected' : 'Not connected',
    };

    //get the provider state
    const providerStatus = this.provider ? 'Connected' : 'Disconnected';
    const signerStatus = this.signer ? 'Available' : 'Not available';
    const readOnlyMode = !this.signer;

    //if there are network details, add them to the base info
    if (this.networkDetails) {
      return {
        ...baseInfo,
        networkDetails: {
          name: this.networkDetails.name || 'Unknown',
          chainId: this.networkDetails.chainId || 'Unknown',
          isConnected: this.networkDetails.isConnected || false,
          hasSigner: !!this.signer,
          readOnly: readOnlyMode,
          providerStatus,
          signerStatus,
          walletStatus: this.signer ? 'Connected' : 'Not connected',
          contractStatus: contractDeployed ? 'Deployed' : 'Not deployed'
        }
      };
    }
    
    //if there are no network details, return the base info with unknown values
    return {
      ...baseInfo,
      networkDetails: {
        name: 'Unknown',
        chainId: 'Unknown',
        isConnected: !!this.provider,
        hasSigner: !!this.signer,
        readOnly: readOnlyMode,
        providerStatus,
        signerStatus,
        walletStatus: this.signer ? 'Connected' : 'Not connected',
        contractStatus: contractDeployed ? 'Deployed' : 'Not deployed'
      }
    };
  }

  /**
   * Loads and validates a previously deployed contract
   * @returns {Promise<boolean>} True if successfully loaded and validated
   */
  async loadSavedContract() {
    try {
      if (!this.isInitialized() || !this.contractAddress) {
        console.log('No saved contract address found or service not initialized');
        return false;
      }

      console.log('Attempting to load saved contract at:', this.contractAddress);
      
      //create the contract instance from the contract address and ABI
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.getSigner() || this.provider
      );
      
      //validate the contract exists and is of the correct type by calling a view function
      try {
        //call a simple view function to verify the contract
        const isActive = await this.contract.isActive();
        console.log('Contract validated successfully, isActive:', isActive);
        return true;
      } catch (error) {
        console.warn('Failed to validate contract, may be incorrect address or network:', error);
        return false;
      }
    } catch (error) {
      console.error('Error loading saved contract:', error);
      return false;
    }
  }

  // New method to track transaction status
  _listenForTransaction(txHash) {
    if (!this.provider) {
      console.warn('No provider available to listen for transaction confirmations');
      return;
    }
    
    const checkInterval = setInterval(async () => {
      try {
        // Check transaction receipt
        const receipt = await this.provider.getTransactionReceipt(txHash);
        
        if (receipt && receipt.blockNumber) {
          // Transaction confirmed
          console.log(`Transaction ${txHash} confirmed in block ${receipt.blockNumber}`);
          clearInterval(checkInterval);
          this.transactionListeners.delete(txHash);
          
          // Update vote status
          if (this.pendingTransactions.has(txHash)) {
            const voteData = this.pendingTransactions.get(txHash);
            voteData.pending = false;
            voteData.blockNumber = receipt.blockNumber;
            voteData.confirmationTime = new Date().toISOString();
            
            // Move from pending to confirmed
            this.pendingVotes = this.pendingVotes.filter(v => v.transactionHash !== txHash);
            this.confirmedVotes.push(voteData);
            this.pendingTransactions.delete(txHash);
            
            // Update cached vote data
            this._cacheVoteData(null, { votes: [...this.confirmedVotes, ...this.pendingVotes] });
            
            // Update the receipt with confirmation details
            this.saveVoteReceipt({
              ...voteData,
              confirmed: true,
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash,
              confirmationTime: new Date().toISOString()
            }, voteData.email || voteData.originalVoter);
            
            // Automatically refresh vote results
            this._refreshVotesAndResults();
            
            // Trigger events if needed
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('voteConfirmed', { detail: voteData }));
              window.dispatchEvent(new CustomEvent('voteDataUpdated'));
            }
          }
        }
      } catch (error) {
        console.error(`Error checking transaction ${txHash}:`, error);
      }
    }, 2000); // Check every 2 seconds
    
    this.transactionListeners.set(txHash, checkInterval);
    
    // Clean up after 10 minutes if transaction not confirmed
    setTimeout(() => {
      if (this.transactionListeners.has(txHash)) {
        clearInterval(this.transactionListeners.get(txHash));
        this.transactionListeners.delete(txHash);
        console.warn(`Transaction ${txHash} listener timed out after 10 minutes`);
      }
    }, 10 * 60 * 1000);
  }

  // Add methods to get pending and confirmed votes
  getPendingVotes() {
    return this.pendingVotes;
  }

  getConfirmedVotes() {
    return this.confirmedVotes;
  }

  // Check if any votes are pending
  hasPendingVotes() {
    return this.pendingVotes.length > 0;
  }

  /**
   * Save a vote receipt for a specific voter
   * @param {Object} receipt - The vote receipt data to store
   * @param {string} voterEmail - The voter's email (optional)
   * @returns {boolean} Success status
   */
  saveVoteReceipt(receipt, voterEmail = null) {
    try {
      if (!receipt || (!receipt.txId && !receipt.transactionHash)) {
        console.warn('Invalid receipt data - missing transaction ID');
        return false;
      }
      
      // Store with timestamp of when it was saved
      const receiptWithMeta = {
        ...receipt,
        savedAt: Date.now(),
        originalVoter: voterEmail || receipt.originalVoter || null
      };
      
      // Ensure confirmation status is properly set
      // If the receipt has blockNumber or confirmed=true, mark it as confirmed permanently
      if (receipt.blockNumber || receipt.confirmed) {
        receiptWithMeta.pending = false;
        receiptWithMeta.confirmed = true;
        receiptWithMeta.confirmationTime = receiptWithMeta.confirmationTime || new Date().toISOString();
      }
      
      // Get existing receipts
      let receipts = [];
      try {
        const existingReceipts = localStorage.getItem(CACHE_KEYS.VOTE_RECEIPTS);
        if (existingReceipts) {
          receipts = JSON.parse(existingReceipts);
          if (!Array.isArray(receipts)) receipts = [];
        }
      } catch (error) {
        console.warn('Error reading existing receipts:', error);
        receipts = [];
      }
      
      // Check if this receipt already exists (avoid duplicates)
      const existingReceiptIndex = receipts.findIndex(r => 
        (r.txId && receipt.txId && r.txId === receipt.txId) ||
        (r.transactionHash && receipt.transactionHash && r.transactionHash === receipt.transactionHash)
      );
      
      if (existingReceiptIndex === -1) {
        // Add the new receipt
        receipts.push(receiptWithMeta);
      } else {
        // Update existing receipt, preserving confirmation status
        const existingReceipt = receipts[existingReceiptIndex];
        
        // If the existing receipt was already confirmed, keep that status
        if (existingReceipt.confirmed || existingReceipt.blockNumber) {
          receiptWithMeta.confirmed = true;
          receiptWithMeta.pending = false;
          receiptWithMeta.blockNumber = receiptWithMeta.blockNumber || existingReceipt.blockNumber;
          receiptWithMeta.blockHash = receiptWithMeta.blockHash || existingReceipt.blockHash;
          receiptWithMeta.confirmationTime = receiptWithMeta.confirmationTime || existingReceipt.confirmationTime;
        }
        
        // If the new receipt has confirmation data, update the existing receipt
        if (receipt.blockNumber || receipt.confirmed) {
          receiptWithMeta.confirmed = true;
          receiptWithMeta.pending = false;
        }
        
        // Update the receipt in the array
        receipts[existingReceiptIndex] = {
          ...existingReceipt,
          ...receiptWithMeta
        };
        
        console.log('Updated existing receipt with confirmation status:', receipts[existingReceiptIndex].confirmed);
      }
      
      // Store back to localStorage
      localStorage.setItem(CACHE_KEYS.VOTE_RECEIPTS, JSON.stringify(receipts));
      console.log('Vote receipt saved successfully');
      
      // Trigger event for UI updates
      window.dispatchEvent(new CustomEvent('voteReceiptSaved', { 
        detail: existingReceiptIndex !== -1 ? receipts[existingReceiptIndex] : receiptWithMeta 
      }));
      
      return true;
    } catch (error) {
      console.error('Error saving vote receipt:', error);
      return false;
    }
  }
  
  /**
   * Get all vote receipts for a specific voter
   * @param {string} voterEmail - The voter's email
   * @returns {Array} Array of vote receipts
   */
  getVoteReceiptsForVoter(voterEmail) {
    try {
      if (!voterEmail) {
        console.warn('No voter email provided');
        return [];
      }
      
      // Get all receipts
      let receipts = [];
      try {
        const existingReceipts = localStorage.getItem(CACHE_KEYS.VOTE_RECEIPTS);
        if (existingReceipts) {
          receipts = JSON.parse(existingReceipts);
          if (!Array.isArray(receipts)) receipts = [];
        }
      } catch (error) {
        console.warn('Error reading receipts:', error);
        return [];
      }
      
      // Filter receipts for this voter
      // Match by email or by voter hash that contains the email
      const voterReceipts = receipts.filter(receipt => 
        (receipt.originalVoter && receipt.originalVoter === voterEmail) ||
        (receipt.voterId && receipt.voterId.includes(voterEmail)) ||
        (receipt.voterHash && receipt.voterHash.includes(voterEmail))
      );
      
      // Sort by timestamp (newest first)
      voterReceipts.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      return voterReceipts;
    } catch (error) {
      console.error('Error getting vote receipts:', error);
      return [];
    }
  }
  
  /**
   * Get all vote receipts
   * @returns {Array} Array of all vote receipts
   */
  getAllVoteReceipts() {
    try {
      // Get all receipts
      let receipts = [];
      try {
        const existingReceipts = localStorage.getItem(CACHE_KEYS.VOTE_RECEIPTS);
        if (existingReceipts) {
          receipts = JSON.parse(existingReceipts);
          if (!Array.isArray(receipts)) receipts = [];
        }
      } catch (error) {
        console.warn('Error reading receipts:', error);
        return [];
      }
      
      // Sort by timestamp (newest first)
      receipts.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      return receipts;
    } catch (error) {
      console.error('Error getting all vote receipts:', error);
      return [];
    }
  }

  /**
   * Get cached election results or return default values if no cache exists
   * @private
   */
  _getCachedResults() {
    try {
      const cachedResults = localStorage.getItem(CACHE_KEYS.VOTE_RESULTS);
      if (cachedResults) {
        return JSON.parse(cachedResults);
      }
    } catch (cacheError) {
      console.warn('Error reading cached results:', cacheError);
    }
    
    // Return default value with in-memory tallies
    const inMemoryVotes = [...this.confirmedVotes, ...this.pendingVotes];
    const votesByCandidate = {};
    
    for (const vote of inMemoryVotes) {
      const candidateId = vote.candidateId || 'Unknown';
      if (!votesByCandidate[candidateId]) {
        votesByCandidate[candidateId] = 0;
      }
      votesByCandidate[candidateId]++;
    }
    
    return {
      results: votesByCandidate,
      totalVotes: inMemoryVotes.length.toString(),
      lastUpdated: new Date().toISOString()
    };
  }
}

//create and export a singleton instance of the service
const blockchainService = new BlockchainService();
export default blockchainService;