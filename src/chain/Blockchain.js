//blockchain for the application to store the votes

import CryptoJS from 'crypto-js';

//block class to store the votes
class Block 
{
  #voterEmail = "";
  #timeOfVote = "";
  #votes = [];
  #previousBlockHash = "";
  #currentBlockHash = ""

  //constructor to initialize the block with the required parameters
  constructor(voterEmail, timeOfVote, vote, previousBlockHash)
  {
    this.voterEmail = voterEmail;
    this.timeOfVote = timeOfVote;
    this.vote = vote;
    this.previousBlockHash = previousBlockHash;

    //set up the string for the current hash (set up string the same way for consistency)
    var hashString = "";
    hashString = hashString + voterEmail;
    hashString = hashString + timeOfVote;
    hashString = hashString + previousBlockHash;
    hashString = hashString + vote;
  
    //hash the string using the MD5 algorithm
    this.currentBlockHash = CryptoJS.MD5(hashString).toString(CryptoJS.enc.Hex);
  }

  //getters and setters for private members (all the fields)
  getVoterEmail() { return this.voterEmail; }
  getDateOfVote() { return this.timeOfVote; }
  getVotes() { return this.vote; }
  getPreviousBlockHash() { return this.previousBlockHash; }
  getCurrentBlockHash() { return this.currentBlockHash; }
}

//genesis block class to store the genesis block (first block in the chain)
class GenisisBlock extends Block
{
  currentBlockHash = ""
  previousBlockHash = ""

  //constructor to initialize the genesis block with the required parameters
  constructor(currentBlockHash, previousBlockHash)
  {
    this.currentBlockHash = currentBlockHash;
    this.previousBlockHash = previousBlockHash;
  }

  //getters for the current and previous block hashes
  getCurrentBlockHash() { return this.currentBlockHash; }
  getPreviousBlockHash() { return this.previousBlockHash; }
}
  
//export the Block and GenisisBlock classes
export { Block, GenisisBlock };