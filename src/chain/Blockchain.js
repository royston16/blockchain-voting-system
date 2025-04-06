import CryptoJS from 'crypto-js';

class Block 
{
  #voterEmail = "";
  #timeOfVote = "";
  #votes = [];
  #previousBlockHash = "";
  #currentBlockHash = ""

  constructor(voterEmail, timeOfVote, vote, previousBlockHash)
  {
    this.voterEmail = voterEmail;
    this.timeOfVote = timeOfVote;
    this.vote = vote;
    this.previousBlockHash = previousBlockHash;

    // do current hash (set up string the same way for consistency)
    var hashString = "";
    hashString = hashString + voterEmail;
    hashString = hashString + timeOfVote;
    hashString = hashString + previousBlockHash;
    hashString = hashString + vote;
    // this log is a leak but hear to check algo validity
    // console.log("String to be hashed: " + hashString)

    this.currentBlockHash = CryptoJS.MD5(hashString).toString(CryptoJS.enc.Hex);
  }

  // getters and setters for private members (all the fields)
  getVoterEmail() { return this.voterEmail; }
  getDateOfVote() { return this.timeOfVote; }
  getVotes() { return this.vote; }
  getPreviousBlockHash() { return this.previousBlockHash; }
  getCurrentBlockHash() { return this.currentBlockHash; }
}
class GenisisBlock extends Block
{
  currentBlockHash = ""
  previousBlockHash = ""

  constructor(currentBlockHash, previousBlockHash)
  {
    this.currentBlockHash = currentBlockHash;
    this.previousBlockHash = previousBlockHash;
  }

  getCurrentBlockHash() { return this.currentBlockHash; }
  getPreviousBlockHash() { return this.previousBlockHash; }
}

export default Block;