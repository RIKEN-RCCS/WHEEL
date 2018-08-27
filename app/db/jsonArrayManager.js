const fs = require("fs-extra");

const uuidv1 = require("uuid/v1");

class JsonArrayManager{
  constructor(filename){
    this.filename=filename;
    this.data=[];
    try{
      this.data=fs.readJsonSync(this.filename);
    }catch(e){
      if(e.code === 'ENOENT'){
        this.write();
      }else{
        throw e;
      }
    }
  }
  async write(){
    return fs.writeJson(this.filename, this.data, {spaces: 4});
  }
  /**
   * add new entry
   * @param {Object} - entry
   * If the entry has 'id' key, the value will be overwritten.
   */
  add(entry){
    entry.id=uuidv1();
    this.data.push(entry);
    return this.write();
  }
  /**
   * add new entry at the top of array
   */
  unshift(entry){
    entry.id=uuidv1();
    this.data.unshift(entry);
    return this.write();
  }
  /**
   * update entry
   * @param {Object} - entry
   */
  update(entry){
    let targetIndex=this.data.findIndex((e)=>{
      return e.id === entry.id;
    });
    Object.assign(this.data[targetIndex],entry);
    return this.write();
  }
  /**
   * remove existing entry
   * @param {string} id - id of target entry
   */
  remove(id){
    this.data=this.data.filter((e)=>{
      return e.id !== id;
    });
    return this.write();
  }
  /**
   * add duplicated entry
   * @param {string} id - id of src entry
   */
  copy(id){
    let target=this.data.find((e)=>{
      return e.id === id;
    });
    let duplicate = Object.assign({}, target);
    duplicate.id = uuidv1();
    this.data.push(duplicate);
    return this.write();
  }
  /**
   * get the entry which have specified id
   * @param {string} id - id
   */
  get(id){
    return this.query('id', id);
  }
  /**
   * get the specified element of array
   * this function will throw RangeError if specified index is out of range
   * @param {string} index - array index
   */
  getByPosition(index){
    return this.data[index];
  }
  /**
   * return entry id with specific key:value pair
   * @param {string} - key
   * @param {string} - value
   */
  getID(key, value){
    let entry = this.query(key, value);
    return entry? entry.id: undefined;
  }
  /**
   * return entry with specific key:value pair
   * @param {string} - key
   * @param {string} - value
   */
  query(key, value){
    return this.data.find((e)=>{
      if(e[key] === value)
        return true;
    });
  }
  /**
   * getter for data array
   */
  getAll(){
    return this.data;
  }
  /**
   * reorder data array
   * @param {string[]} newOrder - array of indeces stored in new order
   */
  reorder(newOrder) {
    if (this.data.length != newOrder.length) {
      return;
    }
    const tmp = Array.from(this.data);
    for(let i=0; i<tmp.length; i++){
      this.data[i] = tmp[newOrder[i]];
    }
    return this.write();
  }
}

module.exports=JsonArrayManager;
