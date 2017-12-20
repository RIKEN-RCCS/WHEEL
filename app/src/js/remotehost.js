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
      mode: 'addHost',
      hostList: [],
      selectedHosts: [],
      testing: null,
      OK: [],
      NG: []
    },
    methods:{
      toggleSelected: function(i){
        let index=this.selectedHosts.indexOf(i);
        if(index === -1){
          this.selectedHosts.push(i);
        }else{
          this.selectedHosts.splice(index,1);
        }
      },
      emitHost: function(){
        if(this.authType === '1'){
          this.hostinfo.keyFile=null;
        }
        socket.emit(this.mode, this.hostinfo);
        resetInputArea();
      },
      editHost: function(){
        this.mode='updateHost';
        this.hostinfo=this.hostList[this.selectedHosts[this.selectedHosts.length-1]];
        this.showInputArea=true;
      },
      quitInput: resetInputArea,
      removeHost: function(){
        this.selectedHosts.forEach((e)=>{
          socket.emit('removeHost', this.hostList[e].id);
        })
      },
      copyHost: function(){
        this.selectedHosts.forEach((e)=>{
          socket.emit('copyHost', this.hostList[e].id);
        })
      },
      browse: browseServerFiles,
      test: testSshConnection,
      buttonState: function(index){
        let state = 'Test';
        if(index === this.testing){
          state ='Testing';
        }else if(this.OK.includes(index)){
          state = 'OK';
        }else if(this.NG.includes(index)){
          state = 'NG';
        }
        return state
      },
      isSelected: function(index){
        return this.selectedHosts.includes(index);
      }
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
    }
  });

  // request host list
  socket.emit('getHostList', true);
  socket.on('hostList', (hostList)=>{
    vm.hostList = hostList;
    vm.selectedHosts=[];
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
    fb.request('getFileList', null, null);
  }

  function testSshConnection(index){
    vm.testing=index;
    let host = vm.hostList[index];
    const html='<p>input password</p><input type=password id="password">'
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

  function resetInputArea(){
    vm.showInputArea=false;
    vm.hostinfo=Object.assign({},defaultHostinfo);
  }
  function isEmpty(string){
    return string === '';
  }
});
