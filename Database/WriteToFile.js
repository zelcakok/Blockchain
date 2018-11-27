module.exports = async (param) => {
  var path = param.path;
  var structure = param.structure;
  const fs = require("fs");
  fs.writeFileSync(path, structure, (err)=>{
    if(err) console.log("Cannot write to file: ", err);
    return Promise.resolve();
  })
};
