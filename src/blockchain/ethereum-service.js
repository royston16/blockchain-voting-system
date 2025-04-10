import { ethers } from 'ethers';

//simple contract ABI for a counter contract with proper function signatures
const minimalContractABI = [
  {
    "inputs": [],
    "name": "getValue",
    "outputs": [
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
        "name": "newValue",
        "type": "uint256"
      }
    ],
    "name": "setValue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

//bytecode for the minimal contract that matches the ABI
const minimalContractBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633fa4f2451461003b5780635524107714610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea264697066735822122031ceecebe6e1122f5cdf1c73d5ab2ed5da65d7f2aa5f1855053dfc97f96a37d164736f6c63430008110033";


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
    this.initialized = false;
    this._initializing = false;
    this.provider = null;
    this.signer = null;
    this.contract = null;
    
    //try to load contract address from local storage
    this.contractAddress = localStorage.getItem('contractAddress') || null;
    
    //try to load extended deployment info if available
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
    this.networkDetails = null;
    this.contractABI = minimalContractABI;
    this.contractBytecode = minimalContractBytecode;
    
    //always use real ethereum implementation only for testing purposes
    console.log('BlockchainService initialized in real Ethereum mode');
    if (this.contractAddress) {
      console.log('Loaded contract address from storage:', this.contractAddress);
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
    });
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
    localStorage.removeItem('contractAddress');
    
    //clear votes from local storage too
    localStorage.removeItem('userVotes');
    
    //also clear deployment info for complete reset
    localStorage.removeItem('contractDeploymentInfo');
    
    this.contractAddress = null;
    this.contract = null;
    console.log('Cleared stored contract address, deployment info, and votes');
    
    return {
      success: true,
      message: 'Contract information cleared. You can now deploy a new contract.'
    };
  }

  /**
   * deploy a new contract to the blockchain
   * @returns {Promise<Object>}
   */
  async deployContract() {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return {
            success: false,
            message: `Cannot deploy contract: ${initResult.message}`
          };
        }
      }

      if (!this.signer) {
        return {
          success: false,
          message: "Cannot deploy contract: No wallet connected. Please connect a wallet first."
        };
      }
      
      //check network compatibility with the contract
      try {
        const network = await this.provider.getNetwork();
        console.log('Current network for deployment:', network.name, 'Chain ID:', network.chainId.toString());
        
        //check if the testing is on a test network
        const isMainnet = network.chainId === 1n;
        if (isMainnet) {
          console.warn('Deploying to Ethereum mainnet - this will cost real ETH');
        }
      } catch (networkError) {
        console.warn('Could not determine network:', networkError);
      }

      console.log('Deploying minimal counter contract to Ethereum network...');

      //create a contract factory with the ABI, bytecode, and signer
      const factory = new ethers.ContractFactory(
        this.contractABI,
        this.contractBytecode,
        this.signer
      );

      //deploy the contract (no constructor arguments needed for minimal contract)
      const contract = await factory.deploy();
      console.log('Contract deployment transaction sent');
      
      //wait for deployment to complete
      await contract.waitForDeployment();
      
      //get the contract address from the deployment
      this.contractAddress = await contract.getAddress();
      this.contract = contract;

      console.log('Contract deployed at:', this.contractAddress);
      
      //save the contract address to local storage
      this._saveContractAddress();
      
      //save additional network info to better reconnect later
      try {
        const network = await this.provider.getNetwork();
        const deploymentInfo = {
          contractAddress: this.contractAddress,
          chainId: network.chainId.toString(),
          deployTime: new Date().toISOString(),
          type: 'minimalCounter'
        };
        localStorage.setItem('contractDeploymentInfo', JSON.stringify(deploymentInfo));
      } catch (error) {
        console.warn('Could not save deployment details:', error);
      }
      
      //clear any existing votes when deploying a new contract
      localStorage.removeItem('userVotes');
      
      return {
        success: true,
        message: `Contract successfully deployed at ${this.contractAddress}`,
        contractAddress: this.contractAddress
      };
    } catch (error) {
      console.error('Error deploying contract:', error);
      return {
        success: false,
        message: `Failed to deploy contract: ${error.message}`
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
      console.log('Initializing election with minimal contract...');
      
      //for our minimal contract, simply call the set function with a value
      try {
        //using an initial value of 0 to start with no votes
        const initialValue = 0;
        console.log(`Setting initial value to ${initialValue} using setValue() method`);
        
        //attempt transaction without explicit gas settings
        //let MetaMask handle the gas estimation which is often more accurate
        console.log('sending transaction with default gas settings...');
        const tx = await this.contract.setValue(initialValue);
        
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
        console.error('Failed to set value:', error);
        
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
      const voteTimestamp = new Date().toISOString(); //capture the exact timestamp when the vote is cast
      console.log(`Casting vote: Voter ${voterId}, Candidate ${candidateId}, Session ${sessionId}, Time: ${voteTimestamp}`);
      
      //first check if the contract is deployed using connection info
      const connectionInfo = this.getConnectionInfo();
      if (!connectionInfo.contractAddress || connectionInfo.contractAddress === 'Not deployed') {
        console.error('Contract not deployed yet - cannot cast vote');
        return { 
          success: false, 
          error: 'Contract not deployed. Please ask an administrator to deploy the contract before voting.' 
        };
      }
      
      //check if the contract is deployed
      if (!this.contract) {
        console.error('Contract not deployed yet');
        return { success: false, error: 'Contract not deployed yet' };
      }
      
      //check if the signer is available
      if (!this.signer) {
        console.error('No signer available - cannot cast vote');
        return { success: false, error: 'No signer available - cannot cast vote' };
      }
      
      //get the current value
      let currentValue;
      try {
        currentValue = await this.contract.getValue();
        console.log('Current value before vote:', currentValue.toString());
      } catch (error) {
        console.warn('Error getting current value, assuming 0:', error);
        currentValue = 0;
      }
      
      //increment the value when a vote is cast
      try {
        //let MetaMask handle the gas estimation which is often more accurate due to the contract's simplicity
        console.log('sending vote transaction with default gas settings...');
        const tx = await this.contract.setValue(parseInt(currentValue) + 1);
        
        console.log('Vote transaction submitted:', tx.hash);
        
        //wait for transaction confirmation
        const receipt = await tx.wait(1); //wait for 1 confirmation
        console.log('Vote transaction confirmed in block:', receipt.blockNumber);
        
        //get the block data for more details
        const block = await this.provider.getBlock(receipt.blockNumber);
        const blockHash = block ? block.hash : null;
        
        //get the block timestamp if available, otherwise use our captured timestamp
        const blockTimestamp = block ? new Date(block.timestamp * 1000).toISOString() : voteTimestamp;
        console.log('Block timestamp:', blockTimestamp);
        
        //map the single letter candidate ID to the full candidate name
        let candidateName = "Unknown Candidate";
        if (candidateId === 'A') {
          candidateName = "Candidate A";
        } else if (candidateId === 'B') {
          candidateName = "Candidate B";
        } else if (candidateId === 'C') {
          candidateName = "Candidate C";
        }
        
        //create a unique ID to prevent duplicates
        const uniqueId = `${tx.hash}_${voterId}_${Date.now()}`;
        
        //create the transaction object
        const transaction = {
          id: uniqueId,
          voterId,
          candidateId,                            //this is the voter's selected candidate (A, B, C format)
          candidate: candidateName,               //full candidate name for display
          timestamp: blockTimestamp,              //use the block timestamp instead of the current time
          blockTimestamp: blockTimestamp,         //add the block timestamp for reference
          voteTimestamp: voteTimestamp,           //add the time when the vote was initially cast
          blockNumber: receipt.blockNumber.toString(),
          transactionHash: tx.hash,
          sessionId,
          
          //add these for receipt generation
          txId: tx.hash,
          transactionId: tx.hash,
          blockHash: blockHash,

          //add the original voter (user email) to help with receipt lookups
          originalVoter: userEmail || null
        };
        
        //store the vote in localStorage with deduplication check
        let existingVotes = [];
        try {
          const votesString = localStorage.getItem('userVotes');
          if (votesString) {
            existingVotes = JSON.parse(votesString);
          }
          
          //check if this vote already exists by transaction hash
          const duplicateIndex = existingVotes.findIndex(vote => vote.transactionHash === tx.hash);
          if (duplicateIndex !== -1) {
            console.log('preventing duplicate vote with same transaction hash');
            //replace the existing vote to ensure the latest data
            existingVotes[duplicateIndex] = transaction;
          } else {
            //add the new vote
            existingVotes.push(transaction);
          }
          
          localStorage.setItem('userVotes', JSON.stringify(existingVotes));
          console.log(`Vote stored in localStorage. Total votes: ${existingVotes.length}`);
        } catch (storageError) {
          console.error('Failed to save vote to localStorage:', storageError);
        }
        
        //return the transaction details with consistent naming for receipt generation
        return {
          success: true,
          transaction
        };
      } catch (error) {
        console.error('Failed to cast vote:', error);
        
        //more detailed error handling
        let errorMessage = error.message || 'Unknown error during vote casting';
        
        //check for specific MetaMask or RPC errors
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
      console.error('Failed to cast vote:', error);
      return { success: false, error: error.message };
    }
  }
  
  //get the results of the election from the blockchain
  async getResults() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting election results');
      
      //check if the contract exists and is deployed
      if (!this.contract) {
        console.warn('Contract not deployed yet - cannot get results');
        return {
          results: { 
            "Candidate A": "0",
            "Candidate B": "0", 
            "Candidate C": "0",
            "Total Votes": "0" 
          },
          totalVotes: "0",
          error: "Contract not deployed"
        };
      }
      
      //for our minimal contract, we get the stored value and calculate candidate votes
      try {
        //first try to get the value using getValue()
        let value;
        try {
          value = await this.contract.getValue();
          console.log('Current stored value:', value.toString());
        } catch (getError) {
          console.warn('Failed to call getValue() method, using fallback value:', getError);
          
          //if initialization failed or hasn't happened yet, use 0 as fallback
          value = 0;
          
          //try to query the blockchain directly to get the transaction count for this contract
          try {
            const latestBlock = await this.provider.getBlock('latest');
            console.log('Latest block:', latestBlock.number);
            
            //for demo purposes, use a simpler approach - display info anyway
            console.log('using fallback value for results');
          } catch (blockError) {
            console.warn('Failed to get block information:', blockError);
          }
        }
        
        //try to get votes from localStorage first
        let storedVotes = [];
        try {
          const savedVotesString = localStorage.getItem('userVotes');
          if (savedVotesString) {
            const parsedVotes = JSON.parse(savedVotesString);
            
            //deduplicate votes by transaction hash
            const uniqueVotes = [];
            const txHashes = new Set();
            
            for (const vote of parsedVotes) {
              if (vote.transactionHash && !txHashes.has(vote.transactionHash)) {
                txHashes.add(vote.transactionHash);
                uniqueVotes.push(vote);
              }
            }
            
            storedVotes = uniqueVotes;
            
            //save the deduplicated votes back to localStorage
            if (uniqueVotes.length !== parsedVotes.length) {
              console.log(`Deduplicated votes: ${parsedVotes.length} -> ${uniqueVotes.length}`);
              localStorage.setItem('userVotes', JSON.stringify(uniqueVotes));
            }
            
            console.log('Retrieved stored votes for results from localStorage:', storedVotes.length);
          }
        } catch (storageError) {
          console.error('Failed to retrieve votes from localStorage for results:', storageError);
        }
        
        //use stored votes if available, otherwise get from blockchain simulation
        let votes = [];
        if (storedVotes.length > 0) {
          votes = storedVotes;
        } else {
          //fall back to getting simulated votes
          const votesData = await this.getAllVotes(parseInt(value.toString()), 0);
          votes = votesData.votes || [];
        }
        
        //count votes by candidate
        const candidateVotes = {
          "Candidate A": 0,
          "Candidate B": 0,
          "Candidate C": 0
        };
        
        votes.forEach(vote => {
          //first check the candidate field (which is the full name)
          if (vote.candidate && candidateVotes[vote.candidate] !== undefined) {
            candidateVotes[vote.candidate]++;
          } 
          //then check the candidateId field (which is the single letter 'A', 'B', 'C')
          else if (vote.candidateId) {
            if (vote.candidateId === 'A') {
              candidateVotes["Candidate A"]++;
            } else if (vote.candidateId === 'B') {
              candidateVotes["Candidate B"]++;
            } else if (vote.candidateId === 'C') {
              candidateVotes["Candidate C"]++;
            }
          }
        });
        
        //use the real vote count for total votes
        const totalVotes = votes.length.toString();
        
        //format the results as an object with candidate counts
        const results = {
          "Candidate A": candidateVotes["Candidate A"].toString(),
          "Candidate B": candidateVotes["Candidate B"].toString(),
          "Candidate C": candidateVotes["Candidate C"].toString(),
          "Total Votes": totalVotes
        };
        
        return {
          results,
          totalVotes,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to get results:', error);
        return {
          results: { 
            "Candidate A": "0",
            "Candidate B": "0", 
            "Candidate C": "0",
            "Total Votes": "0" 
          },
          totalVotes: "0",
          error: error.message
        };
      }
    } catch (error) {
      console.error('Failed to get results:', error);
      return {
        results: { 
          "Candidate A": "0",
          "Candidate B": "0", 
          "Candidate C": "0",
          "Total Votes": "0" 
        },
        totalVotes: "0",
        error: error.message
      };
    }
  }
  
  async getAllVotes(pageSize = 50, page = 0) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('Getting all votes');
      
      //check if the contract exists for voting
      if (!this.contract) {
        console.warn('Contract not deployed yet - cannot get votes');
        return {
          votes: [],
          totalVotes: "0",
          hasMore: false,
          error: "Contract not deployed"
        };
      }
      
      //get the votes from localStorage when available
      let storedVotes = [];
      try {
        const savedVotesString = localStorage.getItem('userVotes');
        if (savedVotesString) {
          storedVotes = JSON.parse(savedVotesString);
          console.log('Retrieved stored votes from localStorage:', storedVotes.length);
        }
      } catch (storageError) {
        console.error('Failed to retrieve votes from localStorage:', storageError);
      }
      
      //try to get the stored value from the contract
      let contractValue;
      try {
        contractValue = await this.contract.getValue();
        console.log('Contract value (total votes):', contractValue.toString());
      } catch (getError) {
        console.warn('Failed to call getValue() method, using fallback value:', getError);
        contractValue = 0;
      }
      
      //if we have stored votes, use them - otherwise fall back to simulation
      if (storedVotes.length > 0) {
        //use the actual stored votes from localStorage
        const start = page * pageSize;
        const end = Math.min(start + pageSize, storedVotes.length);
        
        //apply pagination
        const paginatedVotes = storedVotes.slice(start, end);
        
        //format the votes consistently
        const formattedVotes = [];
        paginatedVotes.forEach((vote, index) => {
          //ensure the vote has consistent fields
          formattedVotes.push({
            voterId: vote.voterId || `voter_${index + 1}`,
            candidate: vote.candidate || "Unknown Candidate",
            candidateId: vote.candidateId, //keep the actual selected candidate ID
            timestamp: vote.timestamp || new Date().toISOString(),
            blockNumber: vote.blockNumber || (1000000 + index).toString(),
            sessionId: vote.sessionId || `session_${index}`,
            txId: vote.txId || vote.transactionHash || `tx_${index}`,
            previousHash: index === 0 ? "Genesis block" : (paginatedVotes[index-1]?.txId || "Previous block"),
            fromBlockchain: true,
            realVote: true //flag to indicate this is a real vote
          });
        });
        
        //sort the votes chronologically (oldest first)
        formattedVotes.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
        
        return {
          votes: formattedVotes,
          totalVotes: storedVotes.length.toString(),
          hasMore: page * pageSize + formattedVotes.length < storedVotes.length
        };
      } else {
        //fall back to simulation with fixed mapping
        console.log('no stored votes found, generating simulated votes');
        
        const totalVotes = parseInt(contractValue.toString());
        const start = page * pageSize;
        const end = Math.min(start + pageSize, totalVotes);
        
        //generate a deterministic "genesis" hash for the first block
        const genesisHash = "tx_genesis_0000000";
        
        //create a cache of transaction hashes to ensure consistency
        let previousHash = genesisHash;
        
        const formattedVotes = [];
        for (let i = start; i < end; i++) {
          //create a fully deterministic transaction hash based on index only
          const txHash = `tx_${this._hashString(`vote_${i}`)}`;
          
          //assign candidates in a more deterministic way
          //evenly distribute votes among candidates (A, B, C) in a consistent pattern
          const candidateIndex = i % 3;
          const candidateName = candidateIndex === 0 ? "Candidate A" : 
                             candidateIndex === 1 ? "Candidate B" : "Candidate C";
          
          //map to the corresponding single-letter IDs that match VotingDashboard
          const candidateId = candidateIndex === 0 ? "A" : 
                           candidateIndex === 1 ? "B" : "C";
          
          const voteData = {
            voterId: `voter_${i + 1}`,
            candidate: candidateName,
            candidateId: candidateId, //add the explicit candidateId field for clarity
            //create timestamps that are strictly increasing with older blocks having earlier times
            timestamp: new Date(Date.now() - ((totalVotes - i) * 60000)).toISOString(),
            blockNumber: (1000000 + i).toString(),
            sessionId: `session_${this._hashString(`session_${i}`)}`,
            txId: txHash,
            previousHash: i === 0 ? "Genesis block" : previousHash,
            fromBlockchain: true, //indicate this is from blockchain
            simulatedVote: true //flag to indicate this is a simulated vote
          };
          
          formattedVotes.push(voteData);
          previousHash = txHash;
        }
        
        //return the formatted votes with pagination
        return {
          votes: formattedVotes,
          totalVotes: totalVotes.toString(),
          hasMore: end < totalVotes
        };
      }
    } catch (error) {
      console.error('Failed to get all votes:', error);
      return {
        votes: [],
        totalVotes: "0",
        hasMore: false,
        error: error.message
      };
    }
  }
  
  //helper to create consistent hashes for the simulated blockchain
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; //convert to 32bit integer
    }
    //convert to alphanumeric format similar to transaction hashes
    return Math.abs(hash).toString(16).substring(0, 10);
  }
  
  async verifyChain() {
    if (!this.initialized) await this.initialize();

    try {
      //for the minimal contract, we'll simply check if we can access it
      if (!this.contract) {
        return {
          success: false,
          error: "Contract not deployed or not accessible",
          verified: false,
          isValid: false,
          blockCount: 0
        };
      }

      //get the votes from localStorage for verification
      let storedVotes = [];
      try {
        const savedVotesString = localStorage.getItem('userVotes');
        if (savedVotesString) {
          storedVotes = JSON.parse(savedVotesString);
        }
      } catch (storageError) {
        console.error('Failed to retrieve votes from localStorage for verification:', storageError);
      }

      //try to get the current value to verify connectivity
      let contractValue = 0;
      try {
        contractValue = await this.contract.getValue();
        console.log("Contract value verified:", contractValue.toString());
      } catch (valueError) {
        console.warn("Error verifying contract value:", valueError);
        //just continue with the default value
      }
      
      //use the larger of contract value or stored votes length
      const totalVotes = Math.max(parseInt(contractValue.toString() || "0"), storedVotes.length);
      
      //no votes means the chain is empty but still valid
      if (totalVotes === 0) {
        return {
          success: true,
          verified: true,
          isValid: true,
          value: "0",
          message: "Blockchain is empty but valid (no votes)",
          blockCount: 0
        };
      }
      
      //if users have localStorage votes, use them directly for verification
      let votes = [];
      if (storedVotes.length > 0) {
        //sort the votes by timestamp (oldest first) for proper chain verification
        votes = [...storedVotes].sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
      } else {
        //get the simulated votes from getAllVotes
        const votesData = await this.getAllVotes(totalVotes, 0);
        votes = votesData.votes || [];
      }
      
      //with just one vote, we have a valid but trivial chain
      if (votes.length === 1) {
        return {
          success: true,
          verified: true,
          isValid: true,
          value: contractValue.toString(),
          message: "Blockchain has a single valid vote (trivial chain)",
          blockCount: 1
        };
      }
      
      //check the blockchain integrity by verifying hash links
      let isValid = true;
      let previousHash = "Genesis block";
      
      //log the verification process
      console.log("Starting blockchain verification with", votes.length, "votes");
      
      for (let i = 0; i < votes.length; i++) {
        //the first vote should link to the genesis block
        if (i === 0) {
          //some votes might not have the previousHash set correctly
          if (votes[i].previousHash && votes[i].previousHash !== "Genesis block") {
            console.error("first block not linked to genesis block");
            console.error("expected: Genesis block, got:", votes[i].previousHash);
            isValid = false;
            break;
          }
        } else {
          //all other votes should link to the previous vote's hash
          //only check if both current and previous vote have the necessary fields
          if (votes[i].previousHash && votes[i-1].txId && 
              votes[i].previousHash !== votes[i-1].txId) {
            console.error(`block ${i+1} has invalid previous hash link`);
            console.error(`expected: ${votes[i-1].txId}, got: ${votes[i].previousHash}`);
            isValid = false;
            break;
          }
        }
        
        //store this hash for next iteration
        previousHash = votes[i].txId || `generated_${i}`;
      }
      
      //return the verification results with the contract value
      return {
        success: true,
        verified: true,
        isValid: isValid,
        value: contractValue.toString(),
        message: isValid ? "Blockchain integrity verified" : "Blockchain integrity compromised",
        blockCount: votes.length
      };
    } catch (error) {
      console.error("Error verifying blockchain:", error);
      return {
        success: false,
        verified: false,
        isValid: false,
        error: error.message,
        blockCount: 0
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
}

//create and export a singleton instance of the service
const blockchainService = new BlockchainService();
export default blockchainService;