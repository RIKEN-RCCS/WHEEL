import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';

import 'jquery-ui/themes/base/all.css';
import '../css/remotehost.css';
import '../css/dialog.css';
import { log } from 'util';
import config from './config';
import configToolTip from './configToolTip';

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
    grpName: '',
    port: 22,
    id: '',
    jobScheduler: '',
    renewInterval: 0,
    renewDelay: 0,
    statusCheckInterval: 10,
    maxStatusCheckError: 10,
    type: "",
    os: "ubuntu16",
    region: "",
    numNodes: "",
    InstanceType: "",
    rootVolume: 8,
    shareStorage: true,
    playbook: "",
    mpi: "",
    compiler: "",
    additionalParams: "",
    additionalParamsForHead: "",
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
          notFormColor();
        } else {
          formColor();
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
        showErrorMessage("hidden");
      },
      onCopyButton: function () {
        this.mode = 'copyHost';
        showErrorMessage("hidden");
        if (this.selectedHost === -1) {
          this.errorMessage = 'Please select Host';
          showErrorMessage("visible");
          return;
        }
        socket.emit('copyHost', this.hostList[this.selectedHost].id);
      },
      onRemoveButton: function () {
        this.mode = 'removeHost';
        showErrorMessage("hidden");
        if (this.selectedHost === -1) {
          this.errorMessage = 'Please select Host';
          showErrorMessage("visible");
          return;
        }
        let deleteHost = this.hostList[this.selectedHost].id;

        const html = '<p id="deleteHostLabel">Are you sure to completely delete this host?</p>';
        const dialogOptions = {
          title: "Delete Host"
        };
        dialogWrapper('#dialog', html, dialogOptions)
          .done(function () {
            socket.emit('removeHost', deleteHost);
            resetNewHost();
          });
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
        if (contentsHpcOrCloud) {
          return {
            name: !isEmpty(this.newHostInfo.name),
            host: !isEmpty(this.newHostInfo.host),
            username: !isEmpty(this.newHostInfo.username),
            path: !isEmpty(this.newHostInfo.path)
          }
        } else if (!contentsHpcOrCloud) {
          return {
            name: !isEmpty(this.newHostInfo.name),
            type: !isEmpty(this.newHostInfo.type),
            os: !isEmpty(this.newHostInfo.os),
            region: !isEmpty(this.newHostInfo.region),
            number: !isEmpty(this.newHostInfo.number),
            InstanceType: !isEmpty(this.newHostInfo.InstanceType),
            rootVolume: !isEmpty(this.newHostInfo.rootVolume),
            shareStorage: !isEmpty(this.newHostInfo.shareStorage)
          }
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

  //draw help message
  updateToolTip();

  function browseServerFiles() {
    const html = '<p id="path"></p><ul id=fileList></ul>';
    const dialogOptions = {
      title: "Select keyfile",
      height: $(window).height() * 0.90,
      width: $(window).width() * 0.60
    };
    const fb = new FileBrowser(socket, '#fileList', 'fileList');
    dialogWrapper('#dialog', html, dialogOptions)
      .done(function () {
        const requested = fb.getRequestedPath();
        const pathSep = requested[0] === '/' ? '/' : '\\';
        let target = requested + pathSep + fb.getLastClicked();
        socket.emit('add', target);
        vm.newHostInfo.keyFile = target;
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
    const dialogOptions = {
      title: "SSH connection check"
    };
    dialogWrapper('#dialog', html, dialogOptions)
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

  function showErrorMessage(view) {
    $("#errorMessage").css("visibility", view);
  }

  // change color in case of "edit" mode.
  function formColor() {
    $('.hostRegFormAreaForHPC input:not([type="radio"])').css('border', '1px solid #ccff00');
    $('.hostRegFormAreaForCloud input:not([type="checkbox"])').css('border', '1px solid #ccff00');
    $('.hostRegFormAreaForCloud textarea').css('border', '1px solid #ccff00');
  }

  function notFormColor() {
    $('.hostRegFormAreaForHPC input:not([type="radio"])').css('border', '1px solid #000000');
    $('.hostRegFormAreaForCloud input:not([type="checkbox"])').css('border', '1px solid #000000');
    $('.hostRegFormAreaForCloud textarea').css('border', '1px solid #000000');
  }

  $("#newButton").click(formColor);
  $("#copyButton").click(notFormColor);
  $("#deleteButton").click(notFormColor);
  $("#cancelButton").click(notFormColor);
  $("#confirmButton").click(notFormColor);

  // Change registration contents button "HPC" "Cloud"
  var contentsHpcOrCloud = true;
  $(".hostType").click(function () {
    var target = $(this).attr("id");
    if (target === 'cloudContentsButton') {
      $(".hostRegFormAreaForHPC").css('display', 'none');
      $(".hostRegFormAreaForCloud").css('display', 'inline-flex');
      $(".hostListAreaForHpc").css('display', 'none');
      $(".hostListAreaForCloud").css('display', 'block');
      $("#hpcContentsButton").css('border', '1px solid #5B5B5F');
      $("#cloudContentsButton").css('border', '1px solid #88BB00');
      defaultHost.type = "aws";
      contentsHpcOrCloud = false;
    } else {
      $(".hostRegFormAreaForHPC").css('display', 'inline-flex');
      $(".hostRegFormAreaForCloud").css('display', 'none');
      $(".hostListAreaForHpc").css('display', 'block');
      $(".hostListAreaForCloud").css('display', 'none');
      $("#hpcContentsButton").css('border', '1px solid #88BB00');
      $("#cloudContentsButton").css('border', '1px solid #5B5B5F');
      defaultHost.type = "";
      contentsHpcOrCloud = true;
    }
    resetNewHost();
    notFormColor();
    vm.selectedHost = -1;
  });

  // for scroll action
  var hostPropertyArea;
  var hostTitleArea;
  function scrollTogether() {
    if (contentsHpcOrCloud) {
      hostPropertyArea = "hostPropertyAreaForHPC";
      hostTitleArea = "hostTitleAreaForHPC";
    } else {
      hostPropertyArea = "hostPropertyAreaForCloud";
      hostTitleArea = "hostTitleAreaForCloud";
    }
    getElement(hostTitleArea).scrollLeft = getElement(hostPropertyArea).scrollLeft;
  }

  function getElement(elementID) {
    return document.getElementById(elementID);
  }

  getElement("hostPropertyAreaForHPC").onscroll = scrollTogether;
  getElement("hostPropertyAreaForCloud").onscroll = scrollTogether;

  var pos = $("#titleUserName").offset();
  $("#iconImg").css('right', window.innerWidth - pos.left + "px");

  function updateToolTip() {
    configToolTip.toolTipTexts.forEach((v) => {
      if (config.tooltip_lang.lang === "jpn") {
        try {
          $("[id=" + v.key + "]").attr('title', v.jpn);
        } catch (e) {
          console.log(v.key + " is not find");
          // none
        }
      }
    });
    return;
  }
});