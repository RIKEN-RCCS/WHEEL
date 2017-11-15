import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';

import 'jquery-ui/themes/base/all.css';
import '../css/remotehost.css';

$(() => {
  // create socket.io instance
  const socket= io('/remotehost');
  const defaultHostinfo={
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
      hostinfo: Object.assign({},defaultHostinfo),
      showInputArea: false,
      authType: '2',
      oldKeyFile: '',
      mode: 'addHost',
      hostList: [],
      selectedHost: []
    },
    methods:{
      toggleSelected: function(e){
        let selectedItem = JSON.parse(e.target.getAttribute('data-host'));
        let index=this.selectedHost.findIndex((e)=>{
          return e.id === selectedItem.id;
        });
        if(index === -1){
          this.selectedHost.push(selectedItem);
          $(e.target).addClass('ui-state-highlight');
        }else{
          this.selectedHost.splice(index,1);
          $(e.target).removeClass('ui-state-highlight');
        }
      },
      emitHost: function(){
        socket.emit(this.mode, vm.hostinfo);
        resetInputArea();
      },
      editHost: function(){
        this.mode='updateHost';
        let lastSelected=this.selectedHost[this.selectedHost.length-1];
        let index=this.hostList.findIndex((e)=>{
          return e.id === lastSelected.id;
        });
        this.hostinfo=this.hostList[index];
        this.showInputArea=true;
      },
      quitInput: resetInputArea,
      removeHost: function(){
        this.selectedHost.forEach((e)=>{
          socket.emit('removeHost', e.id);
        })
      },
      browse: browseServerFiles,
      test: testSshConnection
    },
    computed:{
      isDuplicate: function(){
        if(this.mode === 'updateHost'){
          return false;
        }else{
          return this.hostList.some((e)=>{
            return e.name === this.hostinfo.name;
          });
        }
      },
      validation: function(){
        return{
          name: !isEmpty(this.hostinfo.name),
          host: !isEmpty(this.hostinfo.host),
          username: !isEmpty(this.hostinfo.username),
          path: !isEmpty(this.hostinfo.path)
        }
      },
      hasError: function(){
        return !Object.keys(this.validation).every((key)=>{
          return this.validation[key];
        });
      }
    },
    watch: {
      authType: function(val){
        if(val === 1){
          vm.hostinfo.keyFile=null;
        }else if(val === 2){
          vm.hostinfo.keyFile=vm.oldKeyFile;
        }
      }
    }
  });

  // request host list
  socket.emit('hostListRequest', true);
  socket.on('hostList', (hostList)=>{
    vm.hostList = hostList;
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
      vm.hostinfo.keyFile=target;
    });
    fb.request('fileListRequest', null, null);
  }

  function testSshConnection(e){
    let button = $(e.target);
    button.text('Testing');
    let label = e.target.parentElement.getAttribute('data-name');
    const html='<p>input password</p><input type=password id="password">'
    dialogWrapper('#dialog', html)
      .done(function () {
        let password=$('#password').val();
        socket.emit('testSshConnection', label, password, (isConnect) => {
          if (isConnect) {
            button.text('OK');
          } else {
            button.text('NG');
          }
        });
      });
  }

  function resetInputArea(){
    vm.showInputArea=false;
    vm.hostinfo=Object.assign({},defaultHostinfo);
  }
  function isEmpty(string){
    return string === '';
  }
});
