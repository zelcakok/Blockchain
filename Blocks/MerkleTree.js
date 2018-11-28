const Crypto = require("crypto");
const moment = require("moment");

const Queue = require("./Queue");
const QueueNode = require("./QueueNode");

var ALGO = "sha256";

class MerkleTree {
  constructor(){
    this.memory = new Queue();
  }

  attach(data){
    this.memory.push(QueueNode.pack(data));
    return this;
  }

  genKey(){
    var key = moment().valueOf() + Math.random().toString();
    return MerkleTree.hash(key);
  }

  static hash(...data){
    data = data.join("");
    return Crypto.createHash(ALGO).update(data).digest('hex');
  }

  hash(){
    if(this.memory.isEmpty()) return null;
    var memory = new Queue();
    var merkleRoot = null;
    while(!this.memory.isEmpty()) {
      var first = this.memory.pop("data");
      var last = this.memory.popLast("data");
      merkleRoot = MerkleTree.hash(merkleRoot, first, last);
      memory.push(QueueNode.pack(merkleRoot));
    }
    if(memory.length() === 1) return merkleRoot;
    return this._hash(memory);
  }

  _hash(memory){
    var merkleRoot = null;
    while(memory.length() > 1) {
      var first = memory.pop("data");
      var last = memory.popLast("data");
      merkleRoot = MerkleTree.hash(merkleRoot, first, last);
      memory.push(QueueNode.pack(merkleRoot));
    }
    if(memory.length() === 1) return merkleRoot;
    return this._hash(memory);
  }

  static algo(algo){
    ALGO = algo;
    QueueNode.ALGO = algo;
  }
}
module.exports = MerkleTree;
