import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';

import 'jquery-ui/themes/base/all.css';
import '../css/remotehost.css';
import { log } from 'util';

$(() => {
  // create socket.io instance
  const socket = io('/remotehost');
  socket.on('showMessage', showMessage);
  const defaultHost = {
    name: '',
    host: '',
    path: '',
    username: '',
    keyFile: '',
    numJob: 5,
    queue: '',
    port: 22,
    id: '',
    jobScheduler: '',
    renewInterval: 0,
    renewDelay: 0
  }

  // create vue.js instance and render
  let vm = new Vue({
    el: '#view',
    data: {
      newHostInfo: Object.assign({}, defaultHost),
      authType: '2',
      mode: 'addHost',
      hostList: [],
      selectedHost: -1,
      testing: null,
      OK: [],
      NG: [],
      errorMessage: 'temp'
    },
    methods: {
      toggleSelected: function (i) {
        if (this.selectedHost === i) {
          this.selectedHost = -1;
          resetNewHost();
        } else {
          this.selectedHost = i;
          Object.assign(this.newHostInfo, this.hostList[this.selectedHost]);
          vm.authType = (!this.newHostInfo.keyFile || this.newHostInfo.keyFile.length === 0) ? '1' : '2';
        }
        let index = this.OK.indexOf(-1);
        if (index !== -1) {
          this.OK.splice(index, 1);
        }
        index = this.NG.indexOf(-1);
        if (index !== -1) {
          this.NG.splice(index, 1);
        }
      },
      onAddButton: function () {
        this.selectedHost = -1
        resetNewHost();
        this.errorMessage = '';
        $("#errorMessage").css("visibility", "hidden");
      },
      onCopyButton: function () {
        this.mode = 'copyHost';
        $("#errorMessage").css("visibility", "hidden");
        if (this.selectedHost === -1) {
          this.errorMessage = 'Please select Host';
          $("#errorMessage").css("visibility", "visible");
          return;
        }
        socket.emit('copyHost', this.hostList[this.selectedHost].id);
      },
      onRemoveButton: function () {
        this.mode = 'removeHost';
        $("#errorMessage").css("visibility", "hidden");
        if (this.selectedHost === -1) {
          this.errorMessage = 'Please select Host';
          $("#errorMessage").css("visibility", "visible");
          return;
        }

        $("#deleteCheckDialog").dialog({ width: 334, title: 'Delete Host', modal: true });
      },
      onEditAreaOKButton: function () {
        if (this.authType === '1') {
          this.newHostInfo.keyFile = null;
        }
        if (this.selectedHost === -1) {
          this.mode = 'addHost';
        } else {
          this.mode = 'updateHost';
        }
        socket.emit(this.mode, this.newHostInfo);
        resetNewHost();
        this.selectedHost = -1;
      },
      onEditAreaCancelButton: function () {
        resetNewHost();
        this.selectedHost = -1;
      },
      onDialogOKButton: function () {
        socket.emit('removeHost', this.hostList[this.selectedHost].id);
        resetNewHost();
        $("#deleteCheckDialog").dialog('close');
      },
      onDialogCancelButton: function () {
        $("#deleteCheckDialog").dialog('close');
      },
      isSelected: function (index) {
        let flag;
        if (this.selectedHost === index) {
          flag = true;
        } else {
          flag = false;
        }
        return flag;
      },
      browse: browseServerFiles,
      test: testSshConnection,
      buttonState: function (index) {
        let state = 'Test';
        if (index === this.testing) {
          state = 'Testing';
        } else if (this.OK.includes(index)) {
          state = 'OK';
        } else if (this.NG.includes(index)) {
          state = 'NG';
        }
        return state
      },
    },
    computed: {
      isDuplicate: function () {
        return this.hostList.some((element) => {
          return element.name === this.newHostInfo.name &&
            element.id !== this.newHostInfo.id;
        });
      },
      validation: function () {
        return {
          name: !isEmpty(this.newHostInfo.name),
          host: !isEmpty(this.newHostInfo.host),
          username: !isEmpty(this.newHostInfo.username),
          //path: !isEmpty(this.newHostInfo.path)
        }
      },
      hasError: function () {
        return this.isDuplicate || !Object.keys(this.validation).every((key) => {
          return this.validation[key];
        });
      }
    }
  });

  // request host list
  socket.emit('getHostList', true);
  socket.on('hostList', (hostList) => {
    vm.hostList = hostList;
    vm.selecteds = [];
  });

  function browseServerFiles() {
    const html = '<p id="path"></p><ul id=fileList></ul>';
    const dialogOptions = {
      height: $(window).height() * 0.50,
      width: $(window).width() * 0.50
    };
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    dialogWrapper('#dialog', html, dialogOptions)
      .done(function () {
        let target = fb.getRequestedPath() + '/' + fb.getLastClicked()
        socket.emit('add', target);
        vm.hostinfo.keyFile = target;
      });
    $('#fileList').empty();
    fb.resetOnClickEvents();
    fb.onRecv(function () {
      $('#path').text(fb.getRequestedPath());
    });
    fb.onFileDblClick(function (target) {
      $('#dialog').dialog('close');
      vm.newHostInfo.keyFile = target;
    });
    fb.request('getFileList', null, null);
  }

  function testSshConnection(index) {
    vm.testing = null;
    vm.OK = [];
    vm.NG = [];
    const html = '<p id="sshConnectionLabel">Input SSH connection password.</p><input type=password id="password">'
    dialogWrapper('#dialog', html)
      .done(function () {
        vm.testing = index;
        let password = $('#password').val();
        if (index === -1) {
          socket.emit('tryConnectHost', vm.newHostInfo, password, (isConnect) => {
            vm.testing = null;
            if (isConnect) {
              vm.OK.push(index);
            } else {
              vm.NG.push(index);
            }
          });
        } else {
          let host = vm.hostList[index];
          socket.emit('tryConnectHostById', host.id, password, (isConnect) => {
            vm.testing = null;
            if (isConnect) {
              vm.OK.push(index);
            } else {
              vm.NG.push(index);
            }
          });
        }
      });
  }

  function resetNewHost() {
    Object.assign(vm.newHostInfo, defaultHost);
  }

  function isEmpty(string) {
    return string === '';
  }

  var pos = $("#titleUserName").offset();
  $("#img_user").css('right', window.innerWidth - pos.left + "px");
});
