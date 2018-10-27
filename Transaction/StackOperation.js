const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Stack = require("../DataStructure/Stack");

var stack = new Stack();

class StackOperation {
  static unlockScript(pubKeyHash, pubKey, sig, plaintext){
    this.SIG(sig); //New Payment signature
    this.PUBKEY(pubKey); //Payee public key
    this.OP_DUP();
    this.OP_HASH160();
    this.OP_PUBKEYHASH(pubKeyHash); //The pubKeyHash from prev Payment
    this.OP_EQUALVERIFY();
    return this.OP_CHECKSIG(plaintext);
  }

  static SIG(sig){
    stack.push(sig);
  }

  static PUBKEY(pubKey){
    stack.push(pubKey);
  }

  static OP_DUP(){
    stack.push(stack.peak());
  }

  static OP_HASH160(){
    var key = stack.pop();
    key = Cryptographic.hash160(key);
    stack.push(key);
  }

  static OP_PUBKEYHASH(pubKeyHash){
    // var pubKeyHash = Cryptographic.hash160(pubKey);
    stack.push(pubKeyHash);
  }

  static OP_EQUALVERIFY(){
    var da = stack.pop();
    var db = stack.pop();
    if(da.toString("hex") !== db.toString("hex")) throw "Locking Script Error: Public keys are not matched.";
  }

  static OP_CHECKSIG(plaintext){
    var pubKey = stack.pop();
    var sig = stack.pop();
    return Payment.verify(pubKey, sig, plaintext);
  }
}
module.exports = StackOperation;
