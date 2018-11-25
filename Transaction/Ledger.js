/*
  This ledger is for the logged in user only.
*/
var instance = null;

class Ledger {
  constructor(walletAddr) {
    this.walletAddr = walletAddr;
    this.availBalance = 0;
    this.ledger = new Object();
    this.lastBlockID = "757267672000200000000000"; //The last block that read.
  }

  static getInstance(walletAddr){
    if(instance === null) instance = new Ledger(walletAddr);
    return instance;
  }

  balance(){
    Object.keys(this.ledger).map((paymentID)=>{
      this.availBalance += this.ledger[paymentID].delta;
    })
    return {
      balance: this.availBalance,
      ledger: this.ledger
    }
  }

  addPayment(payment){
    if(!this.isRelated(payment)) return;
    this.ledger[payment.id] = this.parsePayment(payment);
    return this;
  }

  isRelated(payment){
    return this.isPayer(payment.payerAddr) || this.isPayer(payment.payeeAddr);
  }

  parsePayment(payment){
    var isPayer = this.isPayer(payment.payerAddr);
    console.log("isPayer: ", isPayer);
    return {
      target: this.getTargetAddr(payment, isPayer),
      delta: this.getDelta(payment, isPayer)
    }
  }

  getDelta(payment, isPayer = true){
    return isPayer ? -payment.amount : +payment.amount;
  }

  getTargetAddr(payment, isPayer = true){
    return isPayer ? payment.payeeAddr : payment.payerAddr;
  }

  isPayer(payerAddr){
    return payerAddr === this.walletAddr;
  }
}
module.exports = Ledger;
