module.exports = (zetabase)=>{
  zetabase.getStructure().then((structure)=>{
    structure.slot.peers = new Object();
    return Promise.resolve()
  })
};
