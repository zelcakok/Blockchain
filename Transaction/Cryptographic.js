const crypto = require("crypto");
const eccrypto = require("eccrypto");
const ripemd160 = require("ripemd160");
const base58 = require("base58");

class Cryptographic {
  static hash160(plaintext){
    var digest = crypto.createHash("sha256").update(plaintext).digest();
    return new ripemd160().update(digest).digest();
  }

  static base58Encode(bytes){
    var msg = "";
    bytes.forEach((byte)=>msg += base58.encode(parseInt(byte, 10)));
    return msg;
  }
}
module.exports = Cryptographic;
