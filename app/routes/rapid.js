var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');

var tree = [];
tree.push( {'id':__dirname, 'parent':'#', 'text':__dirname, 'type':'dir'} );

// 再帰的にjstree仕様のファイルツリーを作成
var walk = function(p, fileCallback, errCallback) {
  fs.readdir(p, function(err, files) {
    if (err) {
      errCallback(err);
      return;
    }

    files.forEach(function(f) {
      let fp = path.join(p, f); // to full-path
      let r = {'id':fp, 'parent':p, 'text':f};
      if(fs.statSync(fp).isDirectory()) {
        //r.icon = 'jstree-folder';
        tree.push(r);
        walk(fp, fileCallback); // ディレクトリなら再帰
      } else {
        r.icon = 'jstree-file';
        tree.push(r);
      }
    });
  });
  fileCallback();
};

// ツリーをひとつの配列に格納してJSON化して埋め込み
walk(__dirname, function() {
  //console.log(JSON.stringify(tree, undefined, 1));
}, function(err) {
  console.log("err:" + err); // エラー受信
});

// メイン（エディタに編集対象のソースを入れて返す）
router.get('/', function (req, res) {
  fs.readFile(path.resolve('app/views/rapid.html', 'utf-8', function(err, html) {
    if (err) {
      console.log('Error: fs1 ' + err.code);
      return;
    }
    fs.readFile(req.query.source, 'utf-8', function(err, txt) {
      if (err) {
        console.log('Error: fs2 ' + err.code);
        return;
      }
      html = html.replace('INSERT_JSON_HERE', JSON.stringify(tree));
      html = html.replace('INSERT_SOURCE_HERE', txt);
      html = html.replace('INSERT_FILENAME_HERE', req.query.source);
      res.send(html);
    });
  });
      });

// 保存（アップロードされた編集結果をファイルとして保存）
  router.post('/', function(req, res) {
    if(req.body.mode == 'json') {
      let fn = req.body.filename + '.json';
      a = {
        "target_file": './' + fn,
        "target_param": req.body.param
      }
      fn = 'saved/' + fn;
      fs.writeFileSync(fn, JSON.stringify(a, undefined, 1));
      res.send('Ok: ' + fn + ' saved');
      console.log(fn + ' saved.');
    } else {
      let fn = 'saved/' + req.body.filename + '.svy';
      fs.writeFileSync(fn, req.body.text);
      res.send('Ok: ' + fn + ' saved');
      console.log(fn + ' saved.');
    }
  });

module.exports = router;
