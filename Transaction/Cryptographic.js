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

  static base58Decode(bytestr){
    return base58.decode(bytestr);
    var msg = "";
    // bytestr.split("").forEach((byte)=>msg += base58.decode(parseInt(byte, 10)));
    return msg;
  }

  static md5(plaintext){
    return crypto.createHash("md5").update(plaintext).digest("hex");
  }

  static sha256(plaintext){
    return crypto.createHash("sha256").update(plaintext).digest("hex");
  }
}
module.exports = Cryptographic;
