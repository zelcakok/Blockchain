const crypto = require("crypto");
const eccrypto = require("eccrypto");
const Cryptographic = require("../Transaction/Cryptographic");
const Payment = require("../Transaction/Payment");

class Identity {
  constructor(userId){
    this.privateKey = crypto.createHash("sha256").update(userId).digest();
  }

  getPublicKey(){
    return eccrypto.getPublic(this.privateKey);
  }

  getPubKeyHash(){
    return Cryptographic.hash160(this.getPublicKey());
  }

  getBitcoinAddress(){
    var pubKeyHash = Cryptographic.hash160(this.getPublicKey());
    var bitcoinAddr = Cryptographic.base58Encode(pubKeyHash);
    return bitcoinAddr;
  }

  sign(trans){
    var digest = Payment.prepare(trans);
    return eccrypto.sign(this.privateKey, digest);
  }
}
module.exports = Identity;
