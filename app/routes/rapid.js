'use strict';
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

const  express = require('express');
const  router = express.Router();

const {add} = require("./gitOperator");
const {getLogger} = require('../logSettings');
const logger = getLogger('rapid');

/**
 * search git directory
 */
function searchGitRepo(filename){
  const dir = path.dirname(filename);
  const trial = path.resolve(dir, '.git')
  try{
  var stats = fs.statSync(trial);
  }catch(e){
    if(e.code !== "ENOENT"){
      throw e;
    }
    return searchGitRepo(dir);
  }
  if(stats.isDirectory()){
      return dir;
  }else{
      return searchGitRepo(dir);
  }
}

module.exports = function(io){
  // メイン（エディタに編集対象のソースを入れて返す）
  router.get('/', function (req, res) {
    let cwd=req.query.path;
    let filename=req.query.filename;
    let parameterEdit=req.query.pm.toLowerCase()==="true";
    let target = path.resolve(cwd, filename);
    promisify(fs.readFile)(target, 'utf-8')
      .then(function(txt){
        let tree = [];
        if(parameterEdit) {
          let walk = function(p) {
            fs.readdir(p, function(err, files) {
              if (err) {
                logger.warn('fs.readdir failed: ',err);
                return;
              }

              files.forEach(function(f) {
                let fp = path.join(p, f); // to full-path
                let r = {'id':fp, 'parent':p, 'text':f};
                if(fs.statSync(fp).isDirectory()) {
                  //r.icon = 'jstree-folder';
                  tree.push(r);
                  walk(fp); // ディレクトリなら再帰
                } else {
                  r.icon = 'jstree-file';
                  tree.push(r);
                }
              });
            });
          };
          tree.push( {'id':cwd, 'parent':'#', 'text':cwd, 'type':'dir'} );
          walk(cwd);
        }
        res.cookie('path', cwd);
        res.cookie('filename', filename);
        res.cookie('pm', parameterEdit);
        res.render('rapid.ejs',{
          target: txt,
          filename: filename,
          parameterEdit: parameterEdit
        });
        io.of('/rapid').on('connect', function(socket){
          socket.emit('tree', tree);
        });
      })
      .catch((err)=>{
        logger.error('file open failed',err);
      });
  });

  // 保存（アップロードされた編集結果をファイルとして保存）
  router.post('/', function(req, res) {
    let cwd=req.body.path;
    let filename = path.resolve(cwd, req.body.filename);
    let data='';
    if(req.body.mode == 'json') {
      let parameter = {
        "target_file": req.body.filename,
        "target_param": req.body.param
      }
      parameter.target_param.forEach((param)=>{
        if(param.type === 'file'){
          param.list = param.list.map((e)=>{
            return path.basename(e);
          });
        }
        if(param.type === 'integer' || param.type === 'float'){
          if(param.hasOwnProperty("list")){
            param.type = "string";
          }
        }
      });

      filename = filename+'.json';
      data = JSON.stringify(parameter, undefined, 4);
    }else{
      data = req.body.text;
    }
    promisify(fs.writeFile)(filename, data)
      .then(()=>{
        const repoPath = searchGitRepo(filename);
        add(repoPath, filename);
      })
      .then(()=>{
        res.send('Ok: ' + filename + ' saved');
        logger.debug(filename, ' saved.');
      })
      .catch(()=>{
        logger.error(filename, 'save failed!', err);
      });
  });
  return router;
}

