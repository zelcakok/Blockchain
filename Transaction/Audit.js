module.exports = (blocks)=>{
    var ledger = [];
    Object.keys(blocks).map((transKey)=>{
      var block = JSON.parse(blocks[transKey]);
      if(block.hasOwnProperty("payload")) {
        var payment = block.payload.payment;
        console.log(payment, block);
        if(!ledger.includes(payment.tarAddr)) ledger[payment.tarAddr] = 0;
        ledger[payment.tarAddr] += payment.amount;
      }
    })
    return Promise.resolve(ledger);
};
