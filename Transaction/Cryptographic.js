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

  static encryptTimestamp(strTimestamp){
    strTimestamp = strTimestamp.toString();
    var c1 = Cryptographic.expand(strTimestamp);
    var c2 = Cryptographic.num2Char(c1);
    return JSON.stringify(encodeURI(c2));
  }

  // static encryptTimestamp(strTimestamp){
  //   strTimestamp = strTimestamp.toString();
  //   var c1 = Cryptographic.expand(strTimestamp);
  //   var c2 = Cryptographic.num2Char(c1);
  //   return encodeURI(c2);
  // }

  static decryptTimestamp(cipher){
    var c2 = Cryptographic.decodeURI(cipher);
    var c1 = Cryptographic.char2Num(c2);
    return collapse(c1);
  }

  static num2Char(str){
    var res = "";
    for(var i=0; i<str.length; i+=2){
      var num = str[i+1]? [str[i],str[i+1]].join("") : [str[i],"0"].join("");
      res += String.fromCharCode(num);
    }
    return res;
  }

  static char2Num(str){
    var res = "", num = "";
    for(var i=0; i<str.length; i++){
      num = str[i].charCodeAt(0);
      res += parseInt(num) < 10 ? "0"+num : num;
    }
    return (res = res.slice(0, -1));
  }

  static expand(str){
    var res = "";
    for(var i=0; i<str.length-1; i+=2) res+=str.substr(i, i+2);
    return res;
  }

  static collapse(c1){
    c1 = c1.split("");
    return [c1[0],c1[1],c1[2],c1[3],c1[4],c1[5],c1[8],
            c1[9],c1[10],c1[11],c1[16],c1[17],c1[18]].join("");
  }
}
module.exports = Cryptographic;
