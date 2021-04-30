/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
import $ from 'jquery';
import dialogWrapper from './dialogWrapper';

import 'font-awesome/css/font-awesome.css';
import minimatch from 'minimatch';
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
    this.lastDblClickedInfo = { dataType: '', dataPath: '', dataName: '' };
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
  getDirsInfo() {
    return this.lastDblClickedInfo;
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
    if ($(l).attr('data-type') !== 'dir' && $(r).attr('data-type') === 'dir') {
      return 1;
    }
    else if ($(l).attr('data-type') === 'dir' && $(r).attr('data-type') !== 'dir') {
      return -1;
    }
    else {
      return $(l).attr('data-name') > $(r).attr('data-name') ? 1 : -1;
    }
  }
    /**
   * check data-type two li which created in onRecvDefault()
   * @param l,r li element
   * return  true : l contains r (snd or sndd)
   * return  false: does not
   */
  checkSnd(l, r, flag) {
    if (($(l).attr('data-type') === 'file' && $(r).attr('data-type') === 'snd') || ($(l).attr('data-type') === 'dir' && $(r).attr('data-type')=== 'sndd')) {
      if(minimatch($(l).attr('data-name'),$(r).attr('data-name')) && flag === 1) return true;
      if(minimatch($(l).attr('data-name'),$(r).attr('data-name')) && flag === -1) {
        $(l).remove();
        return false;
      }
    }
    return false;
  }
  onRecvDefault() {
    this.socket.on(this.recvEventName, (fileList) => {
      fileList.forEach((data) => {
        if (!this.isValidData(data)) return;
        var icon = this.drawIconImage(data.type, data.path, data.name, data.islink, data.isDir);
        var dataName = data.name.trim();
        var idName = dataName.replace(/([.*+?^=!:$@%&#,"'~;<>{}()|[\]\/\\])/g, "_");
        var item = $(`<li data-path="${data.path}" data-name="${data.name}" data-islink="${data.islink}" data-type="${data.type}" data-isDir="${data.isDir}" class="${data.type}" id="${idName}_data">${icon}${data.name}</li>`);
        var compare = this.compare;
        var checkSnd = this.checkSnd;
        var lengthBefore = $(`${this.idFileList} li`).length;
        var counter = 0;
        $(`${this.idFileList} li`).each(function (i, v) {
          var result = compare(v, item);
          var result2 = checkSnd(v, item, result);
          if (result === 0)
            return false;
          if (result === 1) {
            item.insertBefore(v);
            if(result2) $(v).remove();
            return false;
          }
          counter++;
        });
        if (counter === lengthBefore) {
          $(`${this.idFileList}`).append(item);
        }
        this.defaultColor = $(`${this.idFileList} li`).css('background-color');
        this.requestedPath = data.path;
      })
    });
  }
  onClickDefault() {
    $(this.idFileList).on("click", 'li,i', (event) => {
      var dataType = $(event.target).data('type');
      this.changeColorsWhenSelected(event);
      this.lastClicked = $(event.target).data('name');
      this.changeFileEditButtonWhenSelected(dataType);
    });
  }
  onDirDblClickDefault() {
    let dirPathStack = [];
    let rootDirPath = "";
    let target = "";
    $(this.idFileList).on("dblclick", 'li,i', (event) => {
      const dataType = $(event.target).data('type');
      const dataPath = $(event.target).data('path').trim();
      const dataName = $(event.target).data('name');
      if (dataType === 'dir') {
        if (dirPathStack.length === 0) {
          dirPathStack.push(this.requestedPath);
          rootDirPath = this.requestedPath;
        }
        //dblclicked at rootDir -> display rootDir
        if (dirPathStack.length === 1 && dataName === "../") {
          dirPathStack.push(dataPath);
          target = rootDirPath;
        }

        if (dataName === "../") {
          dirPathStack.pop();
          target = dirPathStack[dirPathStack.length - 1];
        } else {
          const pathSep = dataPath[0] === '/' ? '/' : '\\';
          target = dataPath + pathSep + dataName;
          dirPathStack.push(target);
        }

        this.request(this.sendEventName, target, null);
        $(this.idFileList).empty();
      }
      if (dataType === 'snd' || dataType === 'sndd') {
        target = dataPath;
        this.request('getSNDContents', target, dataName, dataType);
      }
      this.lastDblClickedInfo.dataType = dataType;
      this.lastDblClickedInfo.dataPath = dataPath;
      this.lastDblClickedInfo.dataName = dataName;
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
      $('#editPSFileButton').css('visibility', 'visible');
    } else {
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
