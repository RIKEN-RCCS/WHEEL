const util = require('util');
const fs = require('fs');
class Utility {
  /**
   * escape meta character of regex (from MDN)
   * @param {string} string - target string which will be escaped
   * @return {string} escaped regex string
   */
  escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
  }

  /**
   * write data and emit to client with promise
   * @param {object} data - json object to be writen and emitted
   * @param {string} filename
   * @param {object} sio  - instance of socket.io
   * @param {string} eventName - eventName to send workflow
   */
  writeAndEmit(data, filename, sio, eventName){
    return util.promisify(fs.writeFile)(filename, JSON.stringify(data, null, 4))
      .then(function(){
        sio.emit(eventName, data);
      });
  }
}


module.exports=new Utility;
