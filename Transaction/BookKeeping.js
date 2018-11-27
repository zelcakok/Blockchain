module.exports = (param)=>{
  var blocks = param.blocks;
  var addressBook = param.addressBook;
  var lastBlockID = param.lastBlockID;
  var payments = []
  var blockID = null;

  Object.keys(blocks).map((blockAddr)=>{
    if(parseInt(blockAddr) <= parseInt(lastBlockID)) return;
    var block = JSON.parse(blocks[blockAddr]);
    if(block.hasOwnProperty("payload")) {
      var payloads = JSON.parse(block.payload);
      for(var i=0; i<payloads.length; i++){
        var payment = JSON.parse(payloads[i]).payment;
        payment.payerName = addressBook[payment.payerAddr].email.split("@")[0];
        payment.payeeName = addressBook[payment.payeeAddr].email.split("@")[0];
        payments.push(payment);
      }
      blockID = blockAddr;
    }
  })
  return Promise.resolve({
    payments: payments,
    lastBlockID: blockID
  });
};
