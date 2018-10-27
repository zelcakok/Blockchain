const PROTOCOLS_TRANSACTION = "&ptrans;";

class Broker {
  constructor(wallet){
    console.log(PROTOCOLS_TRANSACTION);
    this.account = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.account.transport.addProtocol(PROTOCOLS_TRANSACTION, (msg)=>{
      console.log("TRNAS: ", msg);
    })
  }

  createPayment(payment){
    this.account.transport.broadcast(PROTOCOLS_TRANSACTION, "Hey protocols");
  }
}

module.exports = Broker;
