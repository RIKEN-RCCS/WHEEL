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
          notFormColor();
        } else {
          formColor();
          this.selectedAccount = i;
          Object.assign(this.newAccount, this.accountList[this.selectedAccount]);
        }
      },
      onAddButton: function () {
        this.selectedAccount = -1
        resetNewAccount();
        showErrorMessage("hidden");
      },
      onRemoveButton: function () {
        this.mode = 'removeAccount';
        showErrorMessage("hidden");
        if (this.selectedAccount === -1) {
          this.errorMessage = 'Please select Account';
          showErrorMessage("visible");
          return;
        }
        let deleteAccount = this.accountList[this.selectedAccount].id;

        const html = '<p id="deleteAccountLabel">Are you sure to completely delete this account?</p>';
        const dialogOptions = {
          title: "Delete Account"
        };
        dialogWrapper('#dialog', html, dialogOptions)
          .done(function () {
            socket.emit('removeAccount', deleteAccount);
            resetNewHost();
          });
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

  function showErrorMessage(view) {
    $("#errorMessage").css("visibility", view);
  }

  $('#drawer_button').click(function () {
    $('#drawerMenu').toggleClass('action', true);
  });

  $('#drawerMenu').mouseleave(function () {
    $('#drawerMenu').toggleClass('action', false);
  });

  var pos = $("#titleUserName").offset();
  $("#iconImg").css('right', window.innerWidth - pos.left + "px");

  function formColor() {
    $('#accountRegFormArea input').css('border', '1px solid #ccff00');
  }
  function notFormColor() {
    $('#accountRegFormArea input').css('border', '1px solid #000000');
  }
  $("#newButton").click(formColor);
  $("#deleteButton").click(notFormColor);
  $("#cancelButton").click(notFormColor);
  $("#confirmButton").click(notFormColor);
});
