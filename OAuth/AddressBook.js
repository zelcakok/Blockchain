const Auth = require("./Auth");

var instance = null;

class AddressBook {
  constructor(){
    this.auth = Auth.getInstance();
    this.addressBook = null;
  }

  static async getInstance(){
    if(instance === null) {
      instance = new AddressBook();
      instance.addressBook = await instance.getAddressBook();
    }
    return instance;
  }

  async getAddressBook(){
    var snapshot = await this.auth.dbClient.ref("/AddressBook").once('value');
    return snapshot.val();
  }

  async getUsername(walletAddr){
    var email = this.addressBook[walletAddr].email;
    return email.split("@")[1];
  }
}
module.exports = AddressBook;
