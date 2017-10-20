import $ from 'jquery';
import Cookies from 'js-cookie';
import 'jstree/dist/jstree';
import Split from 'split.js';

$(() => {
  var param = [];
  var currentTarget = 0;
  var saved = false;
  var old_keyword; // keyword欄の変更検知
  const sourceFileName = Cookies.get('filename');
  const cwd = Cookies.get('path');
  const parameterEdit = Cookies.getJSON('pm');
  $('#file_name').text(sourceFileName);

  // Aceエディタ初期化 see https://ace.c9.io/api/editor.html
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/idle_fingers");
  editor.session.setMode("ace/mode/c_cpp");
  editor.setAutoScrollEditorIntoView(true);
  editor.setShowPrintMargin(false);
  editor.setHighlightSelectedWord(false);
  editor.setHighlightActiveLine(true);
  editor.$blockScrolling = Infinity;

  if(parameterEdit){
    // リサイザブルペイン(https://github.com/nathancahill/Split.js)
    Split(['#left_pane', '#right_pane'], {
      'sizes': [67, 33],
      'gutterSize': 7
    });

    // 選択したテキスト＝サーベイターゲット
    editor.getSession().selection.on('changeSelection', function(e) {
      $('#selected_word').text(editor.session.getTextRange(editor.getSelectionRange()));
    });

    // カーソル行に含まれるターゲットを表示
    editor.getSession().selection.on('changeCursor', function(e) {
      let t = editor.session.getLine(editor.selection.getCursor().row);
      let r = t.match(/%%(.+)%%/);
      if(r != null) {
        for(var i=0; i<param.length; i++) {
          if(param[i].keyword == r[1]) {
            currentTarget = i;
            setForm(i);
            targetList();
            break;
          }
        }
      }
    });

    // HTMLとの関連づけ
    $(function(){ $('#button_new_target').click(function() { newTarget(); }); });
  }
  $(function(){ $('#button_save').click(function() { saveFile(); }); });

  $('#wrapper').hide();
  switchStrForm(false);

  // 未保存でのページ遷移を警告
  $(window).bind('beforeunload', function() {
    if(!saved) {
      return '入力したパラメータが保存されていません';
    }
  });

  if(parameterEdit){
    // get json tree by socket.io
    const sio = io('/rapid');
    sio.on('tree', function(tree){
      console.log('tree: ',tree);
      // ファイルのツリービュー
      $('#file_selector').jstree({
        'plugins':[],
        'core':{
          'themes':{},
          'animation':0,
          'data' : tree
        } });
      console.log('create tree done');
    });
  // フォームの各要素が変更されるたび変数を更新
  $('form').change(function() {
    saved = false;
    readForm();

    if(old_keyword != param[currentTarget].keyword) {
      editor.find(escapeChar(old_keyword));
      editor.replace(escapeChar(param[currentTarget].keyword));
      editor.clearSelection();
      old_keyword = param[currentTarget].keyword;
    }

    if(param[currentTarget].type == 'integer' || param[currentTarget].type == 'float' ) {
      validateNumForm();
    }
    resetForm();
    targetList();
  });

  // ファイル名をテキストエリアへ
  $('#file_selector').on("changed.jstree", function (e, data) {
    $('#list').val($('#list').val() + data.node.id + '\n');
    readForm();
  });
  }


  function resetForm() {
    if(param[currentTarget].type == 'string' || param[currentTarget].type == 'file') {
      switchNumForm(false);
      if(param[currentTarget].type == 'file') {
        $('#wrapper').show();
      } else {
        $('#wrapper').hide();
      }
    } else {
      switchNumForm(true);
    }

    if(param[currentTarget].type == 'integer' || param[currentTarget].type == 'float' ) {
      $('#wrapper').hide();
      switchStrForm(false);
    } else {
      switchStrForm(true);
    }
  }

  // フォームのオンオフ valがfalseでオフ
  function switchNumForm(val) {
    $('#input_min').prop('disabled', !val);
    $('#input_max').prop('disabled', !val);
    $('#input_step').prop('disabled', !val);
  }
  function switchStrForm(val) {
    $('#list').prop('disabled', !val);
  }

  // 入力されたパラメータのチェック
  function validateNumForm() {
    let nums = {
      'Min': param[currentTarget].min,
      'Max': param[currentTarget].max,
      'Step': param[currentTarget].step,
    };

    for(let k in nums) {
      if(nums[k] === undefined) break;
      if(nums[k].trim() === '') break; // 空の場合は無視 スペースだけも無視

      if(!isFinite(nums[k])) {
        errMsg(k + 'の値が数値ではありません');
      } else if(param[currentTarget].type == 'integer' && Math.round(nums[k]) !== +nums[k]) {
        errMsg(k + 'の値が整数ではありません');
      }
    }
  }


  function errMsg(t) {
    //console.log(t);
    alert(t);
  }



  function newTarget() {
    if ($('#selected_word').text().trim() == '') {
      errMsg('ターゲットとなる語が選択されていません(ERR01)');
      return;
    }
    var currentIndex = param.length;
    param[currentIndex] = {
      target:$('#selected_word').text(),
      keyword:`KEYWORD${currentIndex+1}`,
      type:'integer'
    };
    editor.insert(escapeChar(param[currentIndex].keyword)); // 置換後にしないと選択が消える
    currentTarget = currentIndex;
    setForm(currentIndex);
    resetForm();
    targetList();
  }


  function escapeChar(t) {
    return '%%' + t + '%%';
  }


  function targetList() {
    $('#target_list').empty();
    let t = '<tr><th></th><th>Target</th><th>Keyword</th><th>Type</th><th>Min</th><th>Max</th><th>Step</th></tr>';
    $('#target_list').append(t);

    param.forEach(function(v, i) {
      if(currentTarget == i) { // 現在編集中のターゲット以外はリンクとして表示
        t = '<tr><td>' + (i+1) + '</td>';
        t += '<td><b>' + v['target'] + '</b></td>';
      } else {
        t = `<tr class="clickable"onClick="onClickTarget(${i});return false;">`;
        t += '<td>' + (i+1) + '</td><td >' + v['target'] + '</td>';
      }
      t += '<td>' + v['keyword'] + '</td><td>' + v['type'] + '</td><td>';
      t += v['min'] + '</td><td>' + v['max'] + '</td><td>' + v['step'] + '</td></tr>';
      t = t.replace(/undefined/g, '-');
      $('#target_list').append(t);
    });
  }


  function onClickRemove() {
    editor.find(escapeChar(param[currentTarget].keyword));
    editor.replace(param[currentTarget].target);
    editor.clearSelection();
    param.splice(currentTarget);
    if(--currentTarget == -1) {
      currentTarget = 0;
      $('#label_target').text('-');
    }
    targetList();
    setForm(currentTarget);
  }


  function onClickTarget(n) {
    currentTarget = n;
    setForm(n);
    resetForm();
    targetList();
    editor.find(escapeChar(param[n].keyword), {range:null});
    editor.clearSelection();
  }


  function setForm(n) {
    // using jQuery
    $('#label_target').text(param[n]['target']);
    $('input[name="target"]').val(param[n]['target']);
    $('input[name="keyword"]').val(param[n]['keyword']);
    old_keyword = param[n]['keyword'];
    $('input[name="type"][value="' + param[n]['type'] + '"').prop('checked', true);
    $('input[name="min"]').val(param[n]['min']);
    $('input[name="max"]').val(param[n]['max']);
    $('input[name="step"]').val(param[n]['step']);
    $('#list').val(param[n]['list']);
  }

  function saveParamJson(){
    if(param.length == 0) {
      errMsg('保存すべきデータがまだ入力されていません');
      return
    }

    let p = $.extend(true, [], param); // jQueryを使って値渡し
    p.forEach(function(v, i) {
      if(p[i].list) p[i].list = p[i].list.split(/\r\n|\r|\n/); // 改行から配列へ
    });

    let postData = {
      "mode":"json",
      "path": cwd,
      "filename":sourceFileName,
      "param": p
    };
    $.post('/editor', postData, function(r) { console.log(r); });
  }

  // nodeを呼んで保存（URL等ベタ書き注意
  function saveFile() {
    if(parameterEdit){
      saveParamJson();
    }
    let postData = {
      "mode":"text",
      "path": cwd,
      "filename":sourceFileName,
      "text": editor.getValue()
    };
    $.post('/editor', postData, function(r) { console.log(r); });
    saved=true;
  }


  function readForm() {
    let a = $('form'); // フォームの内容を配列化(jQuery使用)
    let m = {};
    a.serializeArray().forEach(function(v, i) {
        m[v.name] = v.value;
    });
    param[currentTarget] = $.extend(true, {}, m); // jQueryを使って値渡し
  }



});
