import fs = require('fs');
import path = require('path');
/**
 * send directory contents via socket.io
 * @param socket socket.io's server instance
 * @param targetDir directory path to read
 * @param sendDirname  flag for send directory name or not
 * @param sendFilename flag for send file name or not
 * @param sendSymlink  flag for send symlink name or not
 * @param filter dict which has 'hide', 'hideDir', 'hideFile' keys and each value must be RegExp.
 *               filenames does not emit if it does not much this filter
 */
export default function(socket: SocketIO.Server, eventName: string, targetDir: string, sendDirname: boolean=true, sendFilename: boolean =true, sendSymlink: boolean =true, filter=null): void{
    fs.readdir(targetDir, function (err, names){
      if(err) throw err;
      names.forEach(function(name){
      console.log(name);
        if(filter!=null){
          if(!filter.hide.test(name)){
      console.log("DEBUG 1");
            return;
          }
        }
        fs.lstat(path.join(targetDir,name), function(err, stats){
          if(err) throw err;
          if(stats.isDirectory() && sendDirname){
            if(filter == null || !filter.hideDir || filter.hideDir.test(name)){
              socket.emit(eventName, {"path": targetDir, "name": name, "isdir": true, "islink": false});
            }
          } if(stats.isFile() && sendFilename){
            if(filter == null || !filter.hideFile || filter.hideFile.test(name)){
              socket.emit(eventName, {"path": targetDir, "name": name, "isdir": false, "islink": false});
            }
          }
          if(stats.isSymbolicLink() && sendSymlink){
            fs.stat(path.join(targetDir,name), function(err, stats){
              if(stats.isDirectory() && sendDirname){
                if(filter == null || !filter.hideDir || filter.hideDir.test(name)){
                  socket.emit(eventName, {"path": targetDir, "name": name, "isdir": true, "islink": true});
                }
              }
              if(stats.isFile() && sendFilename){
                if(filter == null || !filter.hideFile || filter.hideFile.test(name)){
                  socket.emit(eventName,{"path": targetDir, "name": name, "isdir": false, "islink": true});
                }
              }
            });
          }
        });
      });
    });
}
