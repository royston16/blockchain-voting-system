import { connect, Gateway, Identity } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import Web3 from 'web3';

//a simplified implementation that can be switched between mock and real modes
export class EthBlockchainService {
  constructor() {

    this.initialized = false;
    this.useMock = false; //toggle the button to switch between mock and real implementation
    
    //real fabric network parameters (for production)
    this.channelName = 'ethChannel';
    this.chaincodeName = 'votingcontract';
    this.mspId = 'VoterMSP';
    this.serverConnection = 'localhost:7555';
    this.web3 = new Web3('http://127.0.0.1:7555');
  }

  async init()
  {
    try {
      const blockNumber = await web3.eth.getBlockNumber();
      console.log('Successfully connected to Ethereum node!');
      console.log('Latest Block Number:', blockNumber);
      console.log('accounts')
      const accounts = await web3.eth.getAccounts();
      console.log('Available accounts:', accounts);
    } 
    catch (error) {
        console.error('Error connecting to the Ethereum node:', error);
    }
  }

}

//create and export a singleton instance
const ethblockchainService = new EthBlockchainService();
export default ethblockchainService;

