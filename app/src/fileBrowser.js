import $ from 'jquery';
import dialogWrapper from './dialogWrapper';

export default class {
  // public methods
  constructor(socket, idFileList, recvEventName, withContextMenu = false, additionalMenu={}) {
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
  request(sendEventName, path, recvEventName) {
    this.socket.emit(sendEventName, path);
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
    $(this.idFileList).on("click", 'li', (event) => {
      var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
      func(target);
    });
  }
  onFileClick(func) {
    $(this.idFileList).on("click", 'li', (event) => {
      if (!$(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
        func(target);
      }
    });
  }
  onFileDblClick(func) {
    $(this.idFileList).on("dblclick", 'li', (event) => {
      if (!$(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
        func(target);
      }
    });
  }
  onDirClick(func) {
    $(this.idFileList).on("click", 'li', (event) => {
      if ($(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
        func(target);
      }
    });
  }
  onDirDblClick(func) {
    $(this.idFileList).on("dblclick", 'li', (event) => {
      if ($(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
        func(target);
      }
    });
  }
  // private methods
  createContextMenu(additionalMenu, trigger){
    const socket = this.socket;
    const fileList = `${this.idFileList} li`;
    const defaultItems={
        'rename': {
          name: 'Rename',
          callback: function () {
            var path = $(this).data('path');
            var oldName = $(this).data('name');
            var html = '<p>input new filename</p><input type="text" id="newName">';
            dialogWrapper('#dialog', html).done(function () {
              var newName = $('#newName').val();
              var obj = { 'path': path, 'oldName': oldName, 'newName': newName };
              $(fileList).remove(`:contains(${oldName})`);
              socket.emit('rename', obj);
            });
          }
        },
        'delete': {
          name: 'Delete',
          callback: function () {
            var filename = $(this).data('name');
            var target = $(this).data('path') + '/' + filename;
            dialogWrapper('#dialog', 'Are you sure you want to delete this file?').done(function () {
              $(fileList).remove(`:contains(${filename})`);
              socket.emit('remove', target);
            });
          }
        }
    }
    const items = Object.assign({}, additionalMenu, defaultItems);
    return {'items': items}
  }
  registerContextMenu(additionalMenu) {
    const fileList = `${this.idFileList} li`;
    $.contextMenu({
      'selector': fileList,
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
    this.socket.on(this.recvEventName, (data) => {
      if (!this.isValidData(data))
        return;
      var iconClass = data.isdir ? 'fa-folder-o' : 'fa-file-o';
      var icon = data.islink ? `<span class="fa-stack fa-lg"><i class="fa ${iconClass} fa-stack-2x"></i><i class="fa fa-share fa-stack-1x"></i></span>`
        : `<i class="fa ${iconClass} fa-2x" aria-hidden="true"></i>`;
      var item = $(`<li data-path="${data.path}" data-name="${data.name}" data-isdir="${data.isdir}" data-islink="${data.islink}">${icon} ${data.name}</li>`);
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
    });
  }
  onClickDefault() {
    $(this.idFileList).on("click", 'li', (event) => {
      this.changeColorsWhenSelected();
      this.lastClicked = $(event.target).text().trim();
    });
  }
  onDirDblClickDefault() {
    $(this.idFileList).on("dblclick", 'li', (event) => {
      if ($(event.target).data('isdir')) {
        var target = $(event.target).data('path').trim() + '/' + $(event.target).text().trim();
        this.request(this.sendEventName, target, null);
        $(this.idFileList).empty();
      }
    });
  }
  changeColorsWhenSelected() {
    $(`${this.idFileList} li`).css('background-color', this.defaultColor);
    $(event.target).css('background-color', this.selectedItemColor);
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
    if (!data.hasOwnProperty('isdir'))
      return false;
    if (!data.hasOwnProperty('islink'))
      return false;
    if (this.requestedPath === null)
      return true;
    if (!this.isValidPath(this.requestedPath, data.path))
      return false;
    return true;
  }
}
