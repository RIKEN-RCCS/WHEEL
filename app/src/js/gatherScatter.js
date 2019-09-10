"use strict";
import {isValidOutputFilename} from "../../lib/utility.js";
import {tableFooterProps, removeFromArray} from "./rapid2Util.js";

function isValidName(name){
  return isValidOutputFilename(name.replace(/\{\{.*\}\}/,""));
}

export default {
  template: `
    <div>
    <v-card>
      <v-toolbar>
        <v-toolbar-title> {{ title }}</v-toolbar-title>
        <div class="flex-grow-1"></div>
        <v-btn @click="dialog=true" class="text-capitalize"> <v-icon> add </v-icon> add new </v-btn>
      </v-toolbar>
      <v-data-table
         dense
        :headers="[ {value: 'dstName',     text: 'dstName', sortable: true},
                    {value: 'srcName',     text: 'srcName', sortable: true},
                    {value: 'counterpart', text: counterpartProp, sortable: true},
                    {value: 'action',      text: 'Actions',  sortable: false },]"
        :items="container"
        :items-per-page="5"
        :footer-props="tableFooterProps"
      >
        <template v-slot:item.action="{ item }">
          <v-icon small class="mr-2" @click="currentItem=item;Object.assign(newItem, item);dialog=true" > edit </v-icon>
          <v-icon small @click="deleteItem(item)" > delete </v-icon>
        </template>
        <template v-slot:item.counterpart="{ item }">
        <div v-if="item.hasOwnProperty(counterpartProp)">
        {{ item[counterpartProp].slice(0,8) }}
        </div>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="dialog" persistent>
      <v-card>
        <v-card-title>
          <span class="headline">{{ title }}</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
          v-model.trim.lazy="newItem.srcName"
          :label="'srcName'"
          >
          </v-text-field>
          <v-text-field
          v-model.trim.lazy="newItem.dstName"
          :label="'dstName'"
          >
          </v-text-field>
          <v-treeview
          :items=lowerLevelComponents
          :active.sync=active
          dense
          activatable
          ></v-treeview>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click=commitChange>OK</v-btn>
          <v-btn text @click=closeAndResetDialog>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </div>
  `,
  props: ["container", "lowerLevelComponents", "title", "counterpartProp"],
  data(){
    return {
      dialog: false,
      currentItem: null,
      newItem: {srcName:"",dstName:""},
      active: [],
      tableFooterProps
    }
  },
  methods:{
    isValid(){
      if(! isValidName(this.newItem.srcName) ){
        console.log("DEBUG: invalid srcName", this.newItem);
        return false;
      }
      if(! isValidName(this.newItem.dstName) ){
        console.log("DEBUG: invalid dstName", this.newItem);
        return false;
      }

      const index=this.container.findIndex((e)=>{
        return e.srcName === this.newItem.srcName
        && e.dstName === this.newItem.dstName
        && e[this.counterpartProp] === this.newItem[this.counterpartProp]
      });
      if( index  !== -1){
        console.log("DEBUG: duplicated", this.newItem);
        return false;
      }
      return true;
    },
    addItem(){
      if(this.active[0]){
        this.newItem[this.counterpartProp]=this.active[0];
      }
      if(!this.isValid()){
        return
      }
      this.container.push(this.newItem);
    },
    updateItem(item){
      this.newItem[this.counterpartProp]=this.active[0];
      if(!this.isValid()){
        return
      }
      const targetIndex = this.container.findIndex((e)=>{
        return e===item;
      });
      if(targetIndex === -1){
        return
      }
      this.container[targetIndex].srcName = this.newItem.srcName;
      this.container[targetIndex].dstName = this.newItem.dstName;
      this.container[targetIndex][this.counterpartProp] = this.newItem[this.counterpartProp];
      if(typeof this.newItem[this.counterpartProp]=== "undefined"){
        delete this.container[targetIndex][this.counterpartProp]
      }
    },
    deleteItem(item){
      removeFromArray(this.container,item);
    },
    commitChange(){
      if(this.currentItem === null ){
        this.addItem();
      }else{
        this.updateItem(this.currentItem);
      }
      this.closeAndResetDialog();
    },
    closeAndResetDialog(){
      this.dialog= false;
      this.currentItem= null;
      this.newItem={srcName:"",dstName:""};
      this.active=[];
    }
  }
}


