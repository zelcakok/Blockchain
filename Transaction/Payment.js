const crypto = require("crypto");
const eccrypto = require("eccrypto");
const moment = require("moment");

class Payment {
  constructor(prevId, tarAddr, amount){
    this.prevId = prevId;
    this.id = crypto.createHash("md5").update(prevId + tarAddr + amount + moment().valueOf().toString()).digest("hex");
    this.tarAddr = tarAddr;
    this.amount = amount;
  }

  static prepare(trans){
    var digest = crypto.createHash("sha256").update(JSON.stringify(trans)).digest();
    return crypto.createHash("sha256").update(digest).digest();
  }

  static verify(pubKey, digest, trans){
    trans = Payment.prepare(trans);
    return eccrypto.verify(pubKey, trans, digest)
      .then(()=>{return true})
      .catch(()=>{return false})
  }


}
module.exports = Payment;
