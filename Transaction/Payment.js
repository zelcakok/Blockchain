const crypto = require("crypto");
const eccrypto = require("eccrypto");
const moment = require("moment");

class Payment {
  constructor(tarAddr, amount){
    this.id = crypto.createHash("md5").update(tarAddr + amount + moment().valueOf().toString()).digest("hex");
    this.tarAddr = tarAddr;
    this.amount = amount;
    this.timestamp = moment().valueOf();
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
