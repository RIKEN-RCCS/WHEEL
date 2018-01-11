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
      selectedAccount: -1,
      errorMessage: 'temp'
    },
    methods:{
      toggleSelected: function(i) {
        if(this.selectedAccount === i)
        {
          this.selectedAccount = -1;
          resetNewAccount();
          $(".editArea").css("border", "solid 1px white");        
          
        } else {
          this.selectedAccount = i;
          $(".editArea").prop("disabled",true);
          $(".editAreaButton").prop("disabled",true);
          $(".editArea").css("border", "solid 1px white");        
          Object.assign(this.newAccount, this.accountList[this.selectedAccount]);          
        }
      },
      onAddButton:function() {
        if(this.selectedAccount === -1)
        {
          this.mode = 'addAccount';
        } else {
          this.mode = 'updateAccount';
        }
        $("#errorMessage").css("visibility", "hidden");

        $(".editArea").prop("disabled",false);
        $(".editAreaButton").prop("disabled",false);        
        $(".editArea").css("border", "solid 1px yellow");        
      },
      onRemoveButton: function(){
        this.mode = 'removeAccount';
        $("#errorMessage").css("visibility", "hidden");
        console.log(this.selectedAccount);
        console.log(vm.selectedAccount);                          
        if (this.selectedAccount === -1) {
          this.errorMessage = 'Please select Account';
          $("#errorMessage").css("visibility", "visible");                              
          return;
        }

        $("#deleteCheckDialog").dialog({width:300, title: 'Delete Account', modal: true});       
      },
      onEditAreaOKButton: function(){
        socket.emit(this.mode, this.newAccount);
        resetNewAccount();
        this.selectedAccount = -1;                
        $(".editArea").css("border", "solid 1px white");                  
      },
      onEditAreaCancelButton: function(){
        resetNewAccount();
        this.selectedAccount = -1;        
        $(".editArea").css("border", "solid 1px white");
      },    
      onDialogOKButton: function(){
        socket.emit('removeAccount', this.accountList[this.selectedAccount].id);
        resetNewAccount();                              
        $("#deleteCheckDialog").dialog('close');          
      },
      onDialogCancelButton: function(){
        $("#deleteCheckDialog").dialog('close');                      
      },
      isSelected: function(index) {
        let flag;
        if( this.selectedAccount === index)
        {
          flag = true;
        } else {
          flag = false;
        }
        return flag;          
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

  //管理者設定画面へのドロワー
  $('#drawer_button').click(function () {
    $('#drawer_menu').toggleClass('action', true);
  });
      
  $('#drawer_menu').mouseleave(function () {
    $('#drawer_menu').toggleClass('action', false);
  });
});
