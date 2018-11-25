const crypto = require("crypto");
const moment = require("moment");
const MerkleTree = require("./MerkleTree");
const Cryptographic = require("../Transaction/Cryptographic");

var BLOCK_DIFFICULTY = 6;

MerkleTree.algo("sha256");

class Block {
  constructor(prevHash, payload){
    this.merkleRoot = new MerkleTree().attach(payload).hash(); //Change this line if more than 1 transaction.
    this.nonce = 0;
    this.target = BLOCK_DIFFICULTY; //Fixed difficulty, 6 leading zeros.
    this.payload = JSON.stringify(payload); //Fixed to one transaction for now.
    this.timestamp = moment().valueOf();
    this.prevHash = prevHash;
  }

  setDifficulty(diff){
    this.target = diff;
  }

  static genesisBlock(){
    var GENESIS_BLK = new Object();
    GENESIS_BLK.hash = crypto.createHash("sha256").update("GENESIS_BLK").digest("hex");
    return GENESIS_BLK;
  }

  static setDifficulty(diff){
    BLOCK_DIFFICULTY = diff;
  }

  static getDifficulty(){
    return BLOCK_DIFFICULTY;
  }
}
module.exports = Block;
