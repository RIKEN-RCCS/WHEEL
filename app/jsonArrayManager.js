const fs = require("fs");
const util = require("util");

const uuidv1 = require("uuid/v1");

const logger = require("./logger");
const { writeAndEmit } = require("./utility");

class JsonArrayManager{
  constructor(filename){
    this.filename=filename;
    this.data=[];
    util.promisify(fs.readFile)(this.filename)
      .then((data)=>{
        this.data=JSON.parse(data.toString());
      })
      .catch((err)=>{
        if(err.code !== 'ENOENT'){
          logger.error('JSON flie read error', err);
        }
      });
  }
  write(){
    return util.promisify(fs.writeFile)(this.filename, JSON.stringify(this.data, null, 4))
  }
  add(entry){
    entry.id=uuidv1();
    this.data.push(entry)
    return this.write();
  }
  update(entry){
    let targetIndex=this.data.findIndex((e)=>{
      return e.id === entry.id;
    });
    this.data[targetIndex] = entry;
    return this.write();
  }
  remove(id){
    this.data=this.data.filter((e)=>{
      return e.id !== id;
    });
    return this.write();
  }
  copy(id){
    let target=this.data.find((e)=>{
      return e.id === id;
    });
    let duplicate = Object.assign({}, target);
    duplicate.id = uuidv1();
    this.data.push(duplicate);
    return this.write();
  }
  get(id){
    return this.data.find((e)=>{
        if (e.id === id)
            return true;
    });
  }
  getAll(){
    return this.data;
  }
}

module.exports=JsonArrayManager;
