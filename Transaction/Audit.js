module.exports = (blocks)=>{
    var ledger = [];
    Object.keys(blocks).map((transKey)=>{
      var payment = JSON.parse(blocks[transKey].payload).payment;
      if(!ledger.includes(payment.tarAddr)) ledger[payment.tarAddr] = 0;
      ledger[payment.tarAddr] += payment.amount;
    })
    return Promise.resolve(ledger);
};
