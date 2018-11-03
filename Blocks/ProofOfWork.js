module.exports = (block)=>{
    const crypto = require("crypto");
    do {
      var plaintext = JSON.stringify(block) + (block.nonce++).toString();
      var hash = crypto.createHash("sha256").update(plaintext).digest("hex");
    } while(hash.substr(0,block.target).split("0").join("").length!==0)
    block.hash = hash;
    return Promise.resolve(block);
};
