const Crypto = require("crypto");
const moment = require("moment");

const Queue = require("./Queue");
const QueueNode = require("./QueueNode");


var ALGO = "md5";

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
    var merkleRoot = null;
    while(!this.memory.isEmpty()) {
      var first = this.memory.pop("data");
      var last = this.memory.popLast("data");
      merkleRoot = MerkleTree.hash(merkleRoot, first, last);
    }
    return merkleRoot;
  }

  static algo(algo){
    ALGO = algo;
    QueueNode.ALGO = algo;
  }
}
module.exports = MerkleTree;
