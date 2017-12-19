import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';

import 'jquery-ui/themes/base/all.css';
import '../css/remotehost.css';

$(() => {
  // create socket.io instance
  const socket = io('/remotehost');
  const defaultHostInfo = {
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
      newHostInfo: Object.assign({}, defaultHostInfo),
      authType: '2',
      mode: 'addHost',
      hostList: [],
      selectedHostList: [],
      testing: null,
      OK: [],
      NG: [],
      errorMessage: ''
    },
    methods:{
      toggleSelected: function(i) {
        let index=this.selectedHostList.indexOf(i);
        if (index === -1) {
          this.selectedHostList.push(i);
        } else {
          this.selectedHostList.splice(index, 1);
        }
      },
      onAddButton:function() {
        this.mode = 'addHost';
        this.errorMessage = '';
        resetNewHostInfo();

        $("#newHostDialog").dialog({title: 'Add Host', modal: true});
      },
      onUpdateButton: function() {
        this.mode = 'updateHost';
        this.errorMessage = '';

        if (this.selectedHostList.length < 1) {
          this.errorMessage = 'Please select Account';
          return;
        }

        Object.assign(this.newHostInfo, this.hostList[this.selectedHostList[this.selectedHostList.length - 1]]);
        $("#newHostDialog").dialog();
      },
      onCopyButton: function() {
        this.selectedHostList.forEach((index) => {
          socket.emit('copyHost', this.hostList[index].id);
        })
      },
      onRemoveButton: function() {
        this.errorMessage = '';
        if (this.selectedHostList.length < 1) {
          this.errorMessage = 'Please select Account';
          return;
        }

        this.selectedHostList.forEach((index)=>{
          socket.emit('removeHost', this.hostList[index].id);
        })
      },
      onDialogOKButton: function() {
        if (this.authType === '1') {
          this.newHostInfo.keyFile = null;
        }
        socket.emit(this.mode, this.newHostInfo);
        $("#newHostDialog").dialog('close');
      },
      onDialogCancelButton: function() {
        $("#newHostDialog").dialog('close');
      },
      browse: browseServerFiles,
      test: testSshConnection,
      buttonState: function(index) {
        let state = 'Test';
        if(index === this.testing) {
          state ='Testing';
        }else if (this.OK.includes(index)) {
          state = 'OK';
        }else if (this.NG.includes(index)) {
          state = 'NG';
        }
        return state
      },
      isSelected: function(index) {
        return this.selectedHostList.includes(index);
      }
    },
    computed:{
      isDuplicate: function() {
        return this.hostList.some((element) => {
          return element.name === this.newHostInfo.name && 
                 element.id !== this.newHostInfo.id;
        });
      },
      validation: function() {
        return{
          name:     !isEmpty(this.newHostInfo.name),
          host:     !isEmpty(this.newHostInfo.host),
          username: !isEmpty(this.newHostInfo.username),
          path:     !isEmpty(this.newHostInfo.path)
        }
      },
      hasError: function() {
        return this.isDuplicate || !Object.keys(this.validation).every((key) => {
          return this.validation[key];
        });
      }
    }
  });
  
  // request host list
  socket.emit('getHostList', true);
  socket.on('hostList', (hostList)=>{
    vm.hostList = hostList;
    vm.selectedHostList = [];
  });

  function browseServerFiles(){
    const html = '<p id="path"></p><ul id=fileList></ul>';
    const dialogOptions = {
      height: $(window).height() * 0.98,
      width: $(window).width() * 0.98
    };
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    dialogWrapper('#dialog', html, dialogOptions)
      .done(function () {
        socket.emit('add', fb.getRequestedPath() + '/' + fb.getLastClicked());
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
    fb.request('fileListRequest', null, null);
  }

  function testSshConnection(index) {
    vm.testing = index;
    let host = vm.hostList[index];
    const html = '<p>input password</p><input type=password id="password">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let password=$('#password').val();
        socket.emit('tryConnectHost', host.id, password, (isConnect) => {
          vm.testing=null;
          vm.selectedHosts=[];
          if (isConnect) {
            vm.OK.push(index);
          } else {
            vm.NG.push(index);
          }
        });
      });
  }

  function resetNewHostInfo() {
    Object.assign(vm.newHostInfo, defaultHostInfo);
  }

  function isEmpty(string) {
    return string === '';
  }
});
