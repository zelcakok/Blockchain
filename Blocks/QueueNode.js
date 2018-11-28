var ALGO = "sha256"; //Default to sha256

class QueueNode {
  constructor(data){
    this.data = data;
  }

  static algo(algo){
    ALGO = algo;
  }

  static pack(data){
    var QueueNode = require("./QueueNode");
    return new QueueNode(data);
  }
}

module.exports = QueueNode;
