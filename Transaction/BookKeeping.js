module.exports = (blocks, lastBlockID)=>{
  var payments = []
  var blockID = null;
  Object.keys(blocks).map((blockAddr)=>{
    if(parseInt(blockAddr) <= parseInt(lastBlockID)) return;
    var block = JSON.parse(blocks[blockAddr]);
    if(block.hasOwnProperty("payload")) {
      var payment = JSON.parse(block.payload).payment;
      payments.push(payment);
      blockID = blockAddr;
    }
  })
  return Promise.resolve({
    payments: payments,
    lastBlockID: blockID
  });
};
