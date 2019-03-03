import $ from 'jquery';
import dialogWrapper from './dialogWrapper';

import 'font-awesome/css/font-awesome.css';
import '../css/fileBrowser.css';
import config from './config';


export default class {
  // public methods
  constructor(socket, idFileList, recvEventName, withContextMenu = false, additionalMenu = {}) {
    // private properties
    this.defaultColor = null;
    this.selectedItemColor = 'lightblue';
    this.idFileList = null;
    this.lastClicked = null;
    this.sendEventName = null;
    this.recvEventName = null;
    this.socket = null;
    this.requestedPath = null;
    this.socket = socket;
    this.idFileList = idFileList;
    this.recvEventName = recvEventName;
    this.onRecvDefault();
    this.onClickDefault();
    this.onDirDblClickDefault();
    if (withContextMenu) {
      this.registerContextMenu(additionalMenu);
    }
  }
  request(sendEventName, path, recvEventName, sndType) {
    if (sndType === 'snd' || sndType === 'sndd') {
      let isDir;
      if (sndType === 'sndd') {
        isDir = true;
      } else {
        isDir = false;
      }
      this.socket.emit(sendEventName, path, recvEventName, isDir);
    } else {
      this.socket.emit(sendEventName, path);
    }
    this.requestedPath = path;
    this.sendEventName = sendEventName;
    if (!recvEventName) this.recvEventName = recvEventName;
    $(this.idFileList).empty();
  }
  getRequestedPath() {
    return this.requestedPath;
  }
  getSelectedFile() {
    return this.getLastClicked();
  }
  getLastClicked() {
    return this.lastClicked;
  }
  resetOnClickEvents() {
    this.onClickDefault();
    this.onDirDblClickDefault();
  }
  // additional event registers
  onRecv(func) {
    this.socket.on(this.recvEventName, (data) => {
      func(data);
    });
  }
  onClick(func) {
    $(this.idFileList).on("click", 'li,i', (event) => {
      var target = $(event.target).data('path').trim() + '/' + $(event.target).data('name').trim();
      func(target);
    });
  }
  onFileClick(func) {
    $(this.idFileList).on("click", 'li,i', (event) => {
      if (!$(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).data('name').trim();
        func(target);
      }
    });
  }
  onFileDblClick(func) {
    $(this.idFileList).on("dblclick", 'li,i', (event) => {
      if (!$(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).data('name').trim();
        func(target);
      }
    });
  }
  onDirClick(func) {
    $(this.idFileList).on("click", 'li,i', (event) => {
      if ($(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).data('name').trim();
        func(target);
      }
    });
  }
  onDirDblClick(func) {
    $(this.idFileList).on("dblclick", 'li,i', (event) => {
      if ($(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).data('name').trim();
        func(target);
      }
    });
  }
  // private methods
  createContextMenu(additionalMenu, trigger) {
    const socket = this.socket;
    const fileList = `${this.idFileList} li`;
    const defaultItems = {
      'rename': {
        name: 'Rename',
        callback: function () {
          var path = $(this).data('path');
          var oldName = $(this).data('name');
          const dialogOptions = {
            title: "Rename file"
          };
          const html = '<p class="dialogMessage">Input new file name.</p><input type="text" id="newName" class="dialogTextbox">';
          dialogWrapper('#dialog', html, dialogOptions).done(function () {
            var newName = $('#newName').val();
            var obj = { 'path': path, 'oldName': oldName, 'newName': newName };
            $(fileList).remove(`:contains(${oldName})`);
            socket.emit('renameFile', obj);
          });
        }
      },
      'delete': {
        name: 'Delete',
        callback: function () {
          var filename = $(this).data('name');
          var target = $(this).data('path') + '/' + filename;
          const dialogOptions = {
            title: "Delete file"
          };
          const html = '<p class="dialogMessage">Are you sure to delete this file?</p>';
          dialogWrapper('#dialog', html, dialogOptions).done(function () {
            $(fileList).remove(`:contains(${filename})`);
            socket.emit('removeFile', target);
          });
        }
      }
    }
    const items = Object.assign({}, additionalMenu, defaultItems);
    return { 'items': items }
  }
  registerContextMenu(additionalMenu) {
    const fileList = `${this.idFileList} li`;
    $.contextMenu({
      selector: fileList,
      position: function (opt, x, y) {
        opt.$menu.css({ top: y, left: x + 2 });
        //contextmenu item size
        var menuWidth = 134;
        var menuHeight = 38;
        if (x + menuWidth > window.innerWidth) {
          opt.$menu.css({ top: y, left: x - menuWidth - 1 });
        }
        if (y + menuHeight * 2 > window.innerHeight) {
          opt.$menu.css({ top: y - menuHeight * 2, left: x + 1 });
        }
        if (x + menuWidth > window.innerWidth && y + menuHeight * 2 > window.innerHeight) {
          opt.$menu.css({ top: y - menuHeight * 2, left: x - menuWidth - 1 });
        }
      },
      events: {
        show: function () {
          var dataType = $(this).data('type');
          if (dataType === 'file' || dataType === 'dir') {
            return true;
          }
          else {
            return false;
          }
        }
      },
      build: this.createContextMenu.bind(this, additionalMenu)
    });
  }
  /**
   * compare two li which created in onRecvDefault()
   * @param l,r li element
   * return  0: l and r is same
   * return  1: l should be displayed earlier
   * return -1: r shorld be displayed earlier
   */
  compare(l, r) {
    if ($(l).attr('data-name') === $(r).attr('data-name'))
      return 0;
    if ($(l).attr('data-isdir') !== 'true' && $(r).attr('data-isdir') === 'true') {
      return 1;
    }
    else if ($(l).attr('data-isdir') === 'true' && $(r).attr('data-isdir') !== 'true') {
      return -1;
    }
    else {
      return $(l).attr('data-name') > $(r).attr('data-name') ? 1 : -1;
    }
  }
  onRecvDefault() {
    this.socket.on(this.recvEventName, (fileList) => {
      fileList.forEach((data) => {
        if (!this.isValidData(data)) return;
        var icon = this.drawIconImage(data.type, data.path, data.name, data.isdir, data.islink);
        var dataName = data.name;
        var idName = dataName.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "_");
        var item = $(`<li data-path="${data.path}" data-name="${data.name}" data-isdir="${data.isdir}" data-islink="${data.islink}" data-type="${data.type}" class=${data.type} id=${idName}>${icon}${data.name}</li>`);
        var compare = this.compare;
        var lengthBefore = $(`${this.idFileList} li`).length;
        var counter = 0;
        $(`${this.idFileList} li`).each(function (i, v) {
          var result = compare(v, item);
          if (result === 0)
            return false;
          if (result === 1) {
            item.insertBefore(v);
            return false;
          }
          counter++;
        });
        if (counter === lengthBefore) {
          $(`${this.idFileList}`).append(item);
        }
        this.defaultColor = $(`${this.idFileList} li`).css('background-color');
        this.requestedPath = data.path;
        //default hidden
        this.changeFileEditButtonWhenSelected('dir');
      })
    });
  }
  onClickDefault() {
    $(this.idFileList).on("click", 'li,i', (event) => {
      var dataType = $(event.target).data('type');
      this.changeColorsWhenSelected(event);
      console.log($(event.target).data('type'));
      this.lastClicked = $(event.target).data('name').trim();
      this.changeFileEditButtonWhenSelected(dataType);
    });
  }
  onDirDblClickDefault() {
    let dirStack = [];
    let rootDirPath = "";
    $(this.idFileList).on("dblclick", 'li,i', (event) => {
      if ($(event.target).data('type') === 'dir') {
        if (dirStack.length === 0) {
          dirStack.push($(event.target).data('path'));
          rootDirPath = $(event.target).data('path');
        }
        //dblclicked at rootDir -> display rootDir
        if (dirStack.length === 1 && $(event.target).data('name') === "../") {
          dirStack.push($(event.target).data('path'));
          var target = rootDirPath;
        }
        if ($(event.target).data('name') === "../") {
          dirStack.pop();
          var target = dirStack[dirStack.length - 1];
        } else {
          const originalPath = $(event.target).data('path').trim();
          const pathSep = originalPath[0] === '/' ? '/' : '\\';
          var target = originalPath + pathSep + $(event.target).data('name').trim();
          dirStack.push(target);
        }
        this.request(this.sendEventName, target, null);
        $(this.idFileList).empty();
      }
      if ($(event.target).data('type') === 'snd' || $(event.target).data('type') === 'sndd') {
        var target = $(event.target).data('path').trim();
        this.request('getSNDContents', target, $(event.target).data('name'), $(event.target).data('type'));
      }
    });
  }
  drawIconImage(dataTypeTemp, dataPath, dataName, isDir, isLink) {
    var dataType;
    if (dataTypeTemp === "file") {
      dataType = isLink === true ? 'filelink' : 'file';
    }
    if (dataTypeTemp === "dir") {
      dataType = isLink === true ? 'folderlink' : 'dir';
    } else {
      dataType = dataTypeTemp;
    }
    var iconImg = `<img src="${config.fileType_icon[dataType]}" class="filebrowseList" aria-hidden="true" data-type="${dataType}" data-path="${dataPath}" data-name="${dataName}" data-isdir="${isDir}" data-islink="${isLink}" alt="graph">`;
    return iconImg
  }
  changeFileEditButtonWhenSelected(dataType) {
    if (dataType === 'file') {
      $('#editFileButton').css('visibility', 'visible');
      $('#editPSFileButton').css('visibility', 'visible');
    } else {
      $('#editFileButton').css('visibility', 'hidden');
      $('#editPSFileButton').css('visibility', 'hidden');
    }
  }
  changeColorsWhenSelected(e) {
    $(`${this.idFileList} li`).css('background-color', this.defaultColor);
    $(`${this.idFileList} li img`).css('background-color', this.defaultColor);
    $(e.target).css('background-color', this.selectedItemColor);
  }
  isValidPath(path1, path2) {
    var path1 = path1.replace(/\\/g, '/');
    var path2 = path2.replace(/\\/g, '/');
    return path1 === path2;
  }
  isValidData(data) {
    if (!data.hasOwnProperty('path'))
      return false;
    if (!data.hasOwnProperty('name'))
      return false;
    if (!(data.hasOwnProperty('type') && (data.type === "file" || data.type === "dir" || data.type === "snd" || data.type === "sndd")))
      return false;
    if (!data.hasOwnProperty('islink'))
      return false;
    if (this.requestedPath === null)
      return true;
    if (!this.isValidPath(this.requestedPath, data.path))
      return false;
    return true;
  }
  setDisable(disable) {
    this.disable = disable;
    $(this.idFileList).data({ "disable": disable });
    return;
  }
}
