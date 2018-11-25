module.exports = (blocks, lastBlockID)=>{
  var payments = [];
  Object.keys(blocks).map((blockAddr)=>{
    if(parseInt(blockAddr) <= parseInt(lastBlockID)) return;
    var block = JSON.parse(blocks[blockAddr]);
    if(block.hasOwnProperty("payload")) {
      var payment = JSON.parse(block.payload).payment;
      payments.push(payment);
    }
  })
  return Promise.resolve(payments);
};
