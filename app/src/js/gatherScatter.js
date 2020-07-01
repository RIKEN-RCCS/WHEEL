/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
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
        <v-toolbar-title> {{ title }} </v-toolbar-title>
        <div class="flex-grow-1"></div>
        <v-btn @click="dialog=true" class="text-capitalize">
          <v-icon>add</v-icon>
          add new
        </v-btn>
      </v-toolbar>
      <v-data-table
         dense
        :headers="headers"
        :items="container"
        :items-per-page="5"
        :footer-props="tableFooterProps"
      >
        <template v-slot:item.action="{ item }">
          <v-icon small class="mr-2" @click="openDialog(item)" > edit </v-icon>
          <v-icon small @click="deleteItem(item)" > delete </v-icon>
        </template>
        <template v-slot:item.counterpart="{ item }">
        <div v-if="item.hasOwnProperty(counterpartProp)">
        {{ getComponentName(item[counterpartProp]) }}
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
      headers: [ {value: 'srcName', text: 'srcName', sortable: true},
        {value: 'dstName',     text: 'dstName', sortable: true},
        {value: 'counterpart', text: this.counterpartProp, sortable: true},
        {value: 'action',      text: 'Actions',  sortable: false }],
      tableFooterProps
    }
  },
  mounted(){
    if(this.counterpartProp === "srcNode"){
      const first = this.headers.shift()
      const second = this.headers.shift()
      this.headers.unshift(first);
      this.headers.unshift(second);
    }
  },
  methods:{
    openDialog(item){
      console.log("DEBUG: ",item)
      this.currentItem=item;
      Object.assign(this.newItem, item);
      if (typeof this.newItem[this.counterpartProp] !== "undefined"){
        this.active[0]=this.newItem[this.counterpartProp];
      }
      console.log("DEBUG:",this.active)
      this.dialog=true
    },
    getComponentName(id){
      const name = this.$root.$data.componentPath[id]; 
      const tmp=name.split('/');
      return tmp[tmp.length -1]
    },
    isDuplicated(){
      const index=this.container.findIndex((e)=>{
        return e.srcName === this.newItem.srcName
        && e.dstName === this.newItem.dstName
        && e[this.counterpartProp] === this.newItem[this.counterpartProp]
      });
      if( index  !== -1){
        console.log("DEBUG: duplicated", this.newItem);
        return true;
      }
      return false
    },
    isValid(){
      if(! isValidName(this.newItem.srcName) ){
        console.log("DEBUG: invalid srcName", this.newItem);
        return false;
      }
      if(! isValidName(this.newItem.dstName) ){
        console.log("DEBUG: invalid dstName", this.newItem);
        return false;
      }
      return true;
    },
    addItem(){
      if(typeof this.active[0] === "string"){
        this.newItem[this.counterpartProp]=this.active[0];
      }
      if(!this.isValid()){
        return
      }
      if(this.isDuplicated()){
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
      if(typeof this.newItem[this.counterpartProp] === "string"){
        this.container[targetIndex][this.counterpartProp] = this.newItem[this.counterpartProp];
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
      this.active.pop();
    }
  }
}


