import $ from 'jquery';
import Vue from 'vue/dist/vue.esm.js';

import FileBrowser from  './fileBrowser';
import dialogWrapper from './dialogWrapper';

import 'jquery-ui/themes/base/all.css';
import '../css/admin.css';

$(() => {
  // create socket.io instance
  const socket = io('/admin');
  const defaultAccount = {
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
      selectedAccountList: [],
      errorMessage: ''
    },
    methods:{
      toggleSelected: function(i) {
        let index = this.selectedAccountList.indexOf(i);
        if (index === -1) {
          this.selectedAccountList.push(i);
        } else {
          this.selectedAccountList.splice(index, 1);
        }
      },
      onAddButton:function() {
        this.mode = 'addAccount';
        this.errorMessage = '';
        resetNewAccount();
        
        $("#newAccountDialog").dialog({title: 'Add Account', modal: true});
      },
      onUpdateButton: function(){
        this.mode = 'updateAccount';
        this.errorMessage = '';

        if (this.selectedAccountList.length < 1) {
          this.errorMessage = 'Please select Account';
          return;
        }

        Object.assign(this.newAccount, this.accountList[this.selectedAccountList[this.selectedAccountList.length - 1]]);
        $("#newAccountDialog").dialog({title: 'Update Account', modal: true});
      },
      onRemoveButton: function(){
        this.errorMessage = '';
        if (this.selectedAccountList.length < 1) {
          this.errorMessage = 'Please select Account';
          return;
        }

        this.selectedAccountList.forEach((index) => {
          socket.emit('removeAccount', this.accountList[index].id);
        })
      },
      onDialogOKButton: function(){
        socket.emit(this.mode, this.newAccount);
        $("#newAccountDialog").dialog('close');
      },
      onDialogCancelButton: function(){
        $("#newAccountDialog").dialog('close');
      },
      isSelected: function(index) {
        return this.selectedAccountList.includes(index);
      }
    },
    computed:{
      isDuplicate: function() {
        return this.accountList.some((element) => {
          return element.name === this.newAccount.name && 
                 element.id !== this.newAccount.id;
        });
      },
      validation: function() {
        return {
          name: !isEmpty(this.newAccount.name),
          password: !isEmpty(this.newAccount.password),
          workDirectory: !isEmpty(this.newAccount.workDirectory)
        }
      },
      hasError: function() {
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
});
