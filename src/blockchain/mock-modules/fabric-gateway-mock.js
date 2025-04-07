// This is a simple mock for the Hyperledger Fabric Gateway module
// It provides enough structure for our frontend to work with

export const connect = async () => {
  console.log('Mock connect function called');
  return {};
};

export class Gateway {
  connect() {
    return Promise.resolve(this);
  }
  
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

export class Identity {
  static fromX509 = () => new Identity();
  constructor() {}
}

export class Signer {
  static fromPrivateKey = () => new Signer();
  constructor() {}
}

export default {
  connect,
  Gateway,
  Identity,
  Signer
}; 