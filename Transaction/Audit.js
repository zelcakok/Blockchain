module.exports = (blocks)=>{
    var ledger = [];
    Object.keys(blocks).map((transKey)=>{
      var block = JSON.parse(blocks[transKey]);
      if(block.hasOwnProperty("payload")) {
        var payment = JSON.parse(block.payload).payment;
        console.log(payment);
        if(!ledger.includes(payment.tarAddr)) ledger[payment.tarAddr] = 0;
        ledger[payment.tarAddr] += parseFloat(payment.amount);
      }
    })
    console.log("FINAL:",ledger);
    return Promise.resolve(ledger);
};
