const crypto = require("crypto");
const moment = require("moment");
const MerkleTree = require("./MerkleTree");
const Cryptographic = require("../Transaction/Cryptographic");

MerkleTree.algo("sha256");

class Block {
  constructor(prevHash, payload){
    this.merkleRoot = new MerkleTree().attach(payload).hash();
    this.target = 6; //Fixed difficulty, 6 leading zeros.
    this.payload = JSON.stringify(payload); //Fixed to one transaction for now.
    this.timestamp = moment().valueOf();
    this.prevHash = prevHash;
  }

  setDifficulty(diff){
    this.target = diff;
  }

  static mining(block, callback){
    var nonce = 0;
    do {
      var plaintext = JSON.stringify(block) + (nonce++).toString();
      var hash = crypto.createHash("sha256").update(plaintext).digest("hex");
    } while(hash.substr(0,block.target).split("0").join("").length!==0)
    block.hash = hash;
    return callback(block);
  }

  static genesisBlock(){
    var GENESIS_BLK = new Object();
    GENESIS_BLK.hash = crypto.createHash("sha256").update("GENESIS_BLK").digest("hex");
    return GENESIS_BLK;
  }
}
module.exports = Block;
