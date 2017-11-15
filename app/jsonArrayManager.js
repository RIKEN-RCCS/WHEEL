const fs = require("fs");
const util = require("util");

const uuidv1 = require("uuid/v1");

const logger = require("./logger");
const { writeAndEmit } = require("./utility");

class JsonArrayManager{
  constructor(filename, sio, eventName){
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
    this.sio=sio;
    this.eventName=eventName;
  }
  writeAndEmit(){
    writeAndEmit(this.data, this.filename, this.sio, this.eventName);
  }
  add(entry){
    entry.id=uuidv1();
    this.data.push(entry)
    this.writeAndEmit();
  }
  update(entry){
    let targetIndex=this.data.findIndex((e)=>{
      return e.id === entry.id;
    });
    this.data[targetIndex] = entry;
    this.writeAndEmit();
  }
  remove(id){
    this.data=this.data.filter((e)=>{
      return e.id !== id;
    });
    this.writeAndEmit();
  }
}

module.exports=JsonArrayManager;
