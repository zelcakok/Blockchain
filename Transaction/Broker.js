const PROTOCOLS = {
  TRANSACTION: "&ptrans;",
}

class Broker {
  constructor(wallet){
    this.account = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.account.transport.addProtocol(PROTOCOLS.TRNASACTION, (msg)=>{
      console.log("TRNAS: ", msg);
    })
  }

  createPayment(payment){
    this.account.transport.broadcast(PROTOCOLS.TRNASACTION, "Hey protocols");
  }
}

module.exports = Broker;
