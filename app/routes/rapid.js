var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../logger');


var returnRouter = function(io){
  // メイン（エディタに編集対象のソースを入れて返す）
  router.get('/', function (req, res) {
    var tree = [];
    // 再帰的にjstree仕様のファイルツリーを作成
    var walk = function(p) {
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

    var cwd=req.query.path;
    var filename=req.query.filename;
    tree.push( {'id':cwd, 'parent':'#', 'text':cwd, 'type':'dir'} );
    // cwd 以下のファイルツリーを作成
    walk(cwd);
    fs.readFile(path.resolve('app/views/rapid.html'), 'utf-8', function(err, html) {
      if (err) {
        logger.error('Error: fs1 ', err.code);
        return;
      }
      var target = path.resolve(cwd, filename);
      fs.readFile(target, 'utf-8', function(err, txt) {
        if (err) {
          logger.error('Error: fs2 ', err.code);
          return;
        }
        io.of('/rapid').on('connect', function(socket){
          socket.emit('tree', tree);
        });
        //TODO 適当なtemplate engineを導入してreplaceを置き換える
        //ついでにparameter edit 機能のon/offも切り替える
        html = html.replace('INSERT_SOURCE_HERE', txt);
        res.cookie('path', cwd);
        res.cookie('filename', filename);
        res.send(html);
      });
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

module.exports = returnRouter;
