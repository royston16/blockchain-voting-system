//a mock module for the Hyperledger Fabric Gateway that
//provides enough structure for the frontend to work with

//method to connect to the gateway with the required parameters
export const connect = async () => {
  console.log('Mock connect function called');
  return {};
};

//gateway class to connect to the gateway with the required parameters
export class Gateway {
  connect() {
    return Promise.resolve(this);
  }
  
  //method to get the network with the required parameters
  getNetwork() {
    return Promise.resolve({
      getContract: () => ({
        submitTransaction: () => Promise.resolve('mock-tx-id'),
        evaluateTransaction: () => Promise.resolve('{"A":0,"B":0,"C":0}')
      })
    });
  }
  
  disconnect() {
    return;
  }
}

//identity class to get the identity with the required parameters
export class Identity {
  static fromX509 = () => new Identity();
  constructor() {}
}

//signer class to get the signer with the required parameters
export class Signer {
  static fromPrivateKey = () => new Signer();
  constructor() {}
}

//export the connect, Gateway, Identity and Signer classes
export default {
  connect,
  Gateway,
  Identity,
  Signer
}; 