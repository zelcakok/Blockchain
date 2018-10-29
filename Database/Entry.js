// const Checksum = require("checksum");
const moment = require("moment");
const Cryptographic = require("../Transaction/Cryptographic");

class Entry {
  constructor(data){
    this.slot = data;
    this.lastUpdate = null;
    this.checksum = null;
  }

  toJSON(){
    return {
      slot: this.slot,
      lastUpdate: this.lastUpdate,
      checksum: this.checksum
    }
  }

  _checksum(){
    if(this.lastUpdate === null) this.lastUpdate = moment().valueOf();
    // this.checksum = Checksum(JSON.stringify(this.slot) + this.lastUpdate);
    this.checksum = Cryptographic.sha256(JSON.stringify(this.slot) + this.lastUpdate);
    return this;
  }

  _validate(){
    return this.checksum === Cryptographic.sha256(JSON.stringify(this.slot) + this.lastUpdate);
    // return this.checksum === Checksum(JSON.stringify(this.slot) + this.lastUpdate);
  }

  // static validate(obj){
  //   var entry = new Entry(obj.slot);
  //   entry.lastUpdate = obj.lastUpdate;
  //   entry.checksum = obj.checksum;
  //   return entry._validate();
  // }
}

module.exports = Entry;
