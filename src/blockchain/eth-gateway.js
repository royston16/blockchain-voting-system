import { connect, Gateway, Identity } from '@hyperledger/fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';

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
  }

  async init()
  {
    // 
  }

}

//create and export a singleton instance
const ethblockchainService = new EthBlockchainService();
export default ethblockchainService;

