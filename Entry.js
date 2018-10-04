const Checksum = require("checksum");
const moment = require("moment");

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
    this.checksum = Checksum(JSON.stringify(this.slot) + this.lastUpdate);
    return this;
  }

  validate(){
    return this.checksum === Checksum(JSON.stringify(this.slot) + this.lastUpdate);
  }

  static parse(obj){
    var entry = new Entry(obj.slot);
    entry.lastUpdate = obj.lastUpdate;
    entry.checksum = obj.checksum;
    if(!entry.validate()) throw "Entry is being edited.";
    return entry;
  }
}

module.exports = Entry;
