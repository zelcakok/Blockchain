const crypto = require("crypto");
const moment = require("moment");
const MerkleTree = require("./MerkleTree");
const Cryptographic = require("../Transaction/Cryptographic");

var BLOCK_DIFFICULTY = 24;

MerkleTree.algo("sha256");

class Block {
  constructor(prevHash, payloads){
    this.merkleRoot = new MerkleTree();
    this.nonce = 0;
    this.target = BLOCK_DIFFICULTY;
    this.payload = JSON.stringify(payloads);
    this.timestamp = moment().valueOf();
    this.prevHash = prevHash;

    this.fillPayloads(payloads);
  }

  fillPayloads(payloads){
    for(var i=0; i<payloads.length; i++)
      this.merkleRoot.attach(payloads[i]);
    this.merkleRoot = this.merkleRoot.hash();
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
