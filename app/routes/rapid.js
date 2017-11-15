'use strict';
const fs = require('fs');
const path = require('path');
const util = require('util');

const  express = require('express');
const  router = express.Router();

const logger = require('../logger');

module.exports = function(io){
  // メイン（エディタに編集対象のソースを入れて返す）
  router.get('/', function (req, res) {
    let cwd=req.query.path;
    let filename=req.query.filename;
    let parameterEdit=req.query.pm.toLowerCase()==="true";
    let target = path.resolve(cwd, filename);
    util.promisify(fs.readFile)(target, 'utf-8')
      .then(function(txt){
        let tree = [];
        if(parameterEdit) {
          let walk = function(p) {
            fs.readdir(p, function(err, files) {
              if (err) {
                logger.error('fs.readdir failed: ',err);
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
      .catch(function(err){
        logger.error('file open failed');
        logger.error('reason: ', err);
      });
  });

  // 保存（アップロードされた編集結果をファイルとして保存）
  router.post('/', function(req, res) {
    let cwd=req.body.path;
    let filename=req.body.filename;
    let fn = path.resolve(cwd, filename);
    if(req.body.mode == 'json') {
      a = {
        "target_file": './' + fn,
        "target_param": req.body.param
      }
      fn = fn+'.json';
      util.promisify(fs.writeFile)(fn,JSON.stringify(a, undefined, 4))
      .then(function(){
        res.send('Ok: ' + fn + ' saved');
        logger.debug(fn, ' saved.');
      })
      .catch(function(err){
        logger.error('param file save failed! ',fn);
        logger.error('reason: ',err);
      });
    } else {
      util.promisify(fs.writeFile)(fn, req.body.text)
      .then(function(){
        res.send('Ok: ' + fn + ' saved');
        logger.debug(fn, ' saved.');
      })
      .catch(function(err){
        logger.error('file save failed! ', fn);
        logger.error('reason: ',err);
      });
    }
  });
  return router;
}

