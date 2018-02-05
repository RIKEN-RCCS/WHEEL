import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';

import 'jquery-ui/themes/base/all.css';
import '../css/remotehost.css';
import { log } from 'util';

$(() => {
  // create socket.io instance
  const socket = io('/remotehost');
  const defaultHost = {
    name: '',
    host: '',
    path: '',
    username: '',
    keyFile: '',
    numJob: 5,
    queue: '',
    port: 22,
    id: ''
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
          $(".editArea").css("border", "solid 1px white");
        } else {
          this.selectedHost = i;
          $(".editArea").prop("disabled", true);
          $(".editAreaButton").prop("disabled", true);
          $(".editArea").css("border", "solid 1px white");
          Object.assign(this.newHostInfo, this.hostList[this.selectedHost]);
        }
      },
      onAddButton: function () {
        if (this.selectedHost === -1) {
          this.mode = 'addHost';
        } else {
          this.mode = 'updateHost';
        }
        this.errorMessage = '';
        $("#errorMessage").css("visibility", "hidden");
        $(".editArea").prop("disabled", false);
        $(".editAreaButton").prop("disabled", false);
        $(".editArea").css("border", "solid 1px yellow");
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
        socket.emit(this.mode, this.newHostInfo);
        resetNewHost();
        this.selectedHost = -1;
        $(".editArea").css("border", "solid 1px white");
      },
      onEditAreaCancelButton: function () {
        resetNewHost();
        this.selectedHost = -1;
        $(".editArea").css("border", "solid 1px white");
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
    let host = vm.hostList[index];
    vm.testing = null;
    if (!host) {
      console.log('host is not selected');
      return;
    }
    const html = '<p>Input SSH connection password.</p><input type=password id="password">'
    dialogWrapper('#dialog', html)
      .done(function () {
        vm.testing = index;
        let password = $('#password').val();
        socket.emit('tryConnectHost', host.id, password, (isConnect) => {
          console.log(isConnect)
          vm.testing = null;
          vm.selectedHosts = [];
          if (isConnect) {
            vm.OK.push(index);
          } else {
            vm.NG.push(index);
          }
        });
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
