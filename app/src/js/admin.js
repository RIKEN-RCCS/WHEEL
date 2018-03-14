import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from './fileBrowser';
import dialogWrapper from './dialogWrapper';
import showMessage from './showMessage';

import 'jquery-ui/themes/base/all.css';
import '../css/admin.css';

$(() => {
  // create socket.io instance
  const socket = io('/admin');
  socket.on('showMessage', showMessage);
  const defaultAccount = {
    uid: '',
    gid: '',
    name: '',
    password: '',
    workDirectory: '',
    description: '',
    id: ''
  }

  // create vue.js instance and render
  let vm = new Vue({
    el: '#view',
    data: {
      newAccount: Object.assign({}, defaultAccount),
      mode: 'addAccount',
      accountList: [],
      selectedAccount: -1,
      errorMessage: 'temp'
    },
    methods: {
      toggleSelected: function (i) {
        if (this.selectedAccount === i) {
          this.selectedAccount = -1;
          resetNewAccount();
        } else {
          this.selectedAccount = i;
          Object.assign(this.newAccount, this.accountList[this.selectedAccount]);
        }
      },
      onAddButton: function () {
        this.selectedAccount = -1
        resetNewAccount();
        $("#errorMessage").css("visibility", "hidden");
      },
      onRemoveButton: function () {
        this.mode = 'removeAccount';
        $("#errorMessage").css("visibility", "hidden");
        console.log(this.selectedAccount);
        console.log(vm.selectedAccount);
        if (this.selectedAccount === -1) {
          this.errorMessage = 'Please select Account';
          $("#errorMessage").css("visibility", "visible");
          return;
        }

        $("#deleteCheckDialog").dialog({ width: 356, title: 'Delete Account', modal: true });
      },
      onEditAreaOKButton: function () {
        console.log(this.selectedAccount);
        if (this.selectedAccount === -1) {
          this.mode = 'addAccount';
        } else {
          this.mode = 'updateAccount';
        }
        socket.emit(this.mode, this.newAccount);
        resetNewAccount();
        this.selectedAccount = -1;
      },
      onEditAreaCancelButton: function () {
        resetNewAccount();
        this.selectedAccount = -1;
      },
      onDialogOKButton: function () {
        socket.emit('removeAccount', this.accountList[this.selectedAccount].id);
        resetNewAccount();
        $("#deleteCheckDialog").dialog('close');
      },
      onDialogCancelButton: function () {
        $("#deleteCheckDialog").dialog('close');
      },
      isSelected: function (index) {
        let flag;
        if (this.selectedAccount === index) {
          flag = true;
        } else {
          flag = false;
        }
        return flag;
      }
    },
    computed: {
      isDuplicate: function () {
        return this.accountList.some((element) => {
          return element.name === this.newAccount.name &&
            element.id !== this.newAccount.id;
        });
      },
      validation: function () {
        return {
          uid: !isEmpty(this.newAccount.uid),
          gid: !isEmpty(this.newAccount.gid),
          name: !isEmpty(this.newAccount.name),
          password: !isEmpty(this.newAccount.password),
          workDirectory: !isEmpty(this.newAccount.workDirectory)
        }
      },
      hasError: function () {
        return this.isDuplicate || !Object.keys(this.validation).every((key) => {
          return this.validation[key];
        });
      }
    }
  });

  // request account list
  socket.emit('getAccountList', true);
  socket.on('accountList', (accountList) => {
    vm.accountList = accountList;
    vm.selecteds = [];
  });

  function resetNewAccount() {
    Object.assign(vm.newAccount, defaultAccount);
  }

  function isEmpty(string) {
    return string === '';
  }

  //管理者設定画面へのドロワー
  $('#drawer_button').click(function () {
    $('#drawer_menu').toggleClass('action', true);
  });

  $('#drawer_menu').mouseleave(function () {
    $('#drawer_menu').toggleClass('action', false);
  });

  var pos = $("#titleUserName").offset();
  $("#img_user").css('right', window.innerWidth - pos.left + "px");
});
