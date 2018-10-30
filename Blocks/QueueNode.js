var ALGO = "md5"; //Default to md5

class QueueNode {
  constructor(data){
    this.data = data;
  }

  static algo(algo){
    ALGO = algo;
  }

  static pack(data){
    var QueueNode = require("./Node");
    return new QueueNode(data);
  }
}

module.exports = QueueNode;
