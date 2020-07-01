/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
"use strict";
import { tableFooterProps, removeFromArray } from "./rapid2Util.js";

export default {
  template:`
  <div>
    <v-card>
      <v-toolbar>
        <v-toolbar-title> parameters </v-toolbar-title>
        <div class="flex-grow-1"></div>
        <v-text-field outlined readonly v-model="keyword"></v-text-field>
        <v-btn @click="dialog=true" class="text-capitalize">
          <v-icon>add</v-icon>
          add new parameter
        </v-btn>
        <v-btn @click="$emit('openFilterEditor')">
        <v-icon> edit </v-icon>
        add filter
        </v-btn>
      </v-toolbar>
      <v-data-table
         dense
        :headers="[{text: 'keyword', value: 'keyword', sortable: true},
        { text: 'Actions', value: 'action', sortable: false }]"
        :items="params"
        :items-per-page="5"
        :footer-props="tableFooterProps"
      >
        <template v-slot:item.action="{ item }">
          <v-icon small class="mr-2" @click="openDialog(item)"> edit </v-icon>
          <v-icon small @click="deleteItem(item)" > delete </v-icon>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="dialog" persistent>
      <v-card>
        <v-card-title>
        <span class="headline"> parameter setting </span>
        </v-card-title>
        <v-card-text>
          <v-select
            outlined
            v-model="newItem.type"
            :items="['min-max-step', 'list', 'files']"
          ></v-select>
          <v-layout v-if="newItem.type==='min-max-step'">
            <v-text-field v-model="newItem.min" type="number" hint="min" persistent-hint :rules="[rules.required]" novalidate></v-text-field>
            <v-text-field v-model="newItem.max" type="number" hint="max" persistent-hint :rules="[rules.required]" novalidate></v-text-field>
            <v-text-field v-model="newItem.step" type="number" hint="step" persistent-hint :rules="[rules.required]" novalidate></v-text-field>
          </v-layout>
          <div v-if="newItem.type==='list'">
            <v-data-table
            dense
            :headers="[{text: 'value', value: 'item', sortable: true},
                       { text: 'Actions', value: 'action', sortable: false }]"
            :items="newItem.list"
            >
              <template v-slot:top>
                <v-btn @click="newItem.list.push({item:''})" class="text-capitalize">
                  <v-icon>add</v-icon>
                  add new
                </v-btn>
              </template v-slot:top>
              <template v-slot:item.action="{ item }">
                <v-icon small @click="removeFromArray(newItem.list,item)" > delete </v-icon>
              </template>
              <template v-slot:item.item="props">
                <v-edit-dialog
                :return-value.sync="props.item.item"
                lazy
                >
                  {{ props.item.item }}
                  <template v-slot:input>
                    <v-text-field
                      v-model="props.item.item"
                      label="edit"
                      single-line
                    ></v-text-field>
                  </template>
                </v-edit-dialog>
              </template>
            </v-data-table>
          </div>
          <div v-if="newItem.type==='files'">
            <v-data-table
            dense
            :headers="[{text: 'value', value: 'item', sortable: true},
                       { text: 'Actions', value: 'action', sortable: false }]"
            :items="newItem.files"
            >
              <template v-slot:top>
                <v-btn @click="newItem.files.push({item:''})" class="text-capitalize">
                  <v-icon>add</v-icon>
                  add new
                </v-btn>
              </template v-slot:top>
              <template v-slot:item.action="{ item }">
                <v-icon small @click="removeFromArray(newItem.files,item)" > delete </v-icon>
              </template>
              <template v-slot:item.item="props">
                <v-edit-dialog
                :return-value.sync="props.item.item"
                lazy
                >
                  {{ props.item.item }}
                  <template v-slot:input>
                    <v-text-field
                      v-model="props.item.item"
                      label="edit"
                      single-line
                    ></v-text-field>
                  </template>
                </v-edit-dialog>
              </template>
            </v-data-table>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click=commitChange><v-icon>save</v-icon>save</v-btn>
          <v-btn @click=closeAndResetDialog><v-icon>cancel</v-icon>cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="filterDialog" persistent>
      <v-card>
        <v-card-title>
        </v-card-title>
        <v-card-text>
        <v-text-field v-model="filterText" label="filter"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click=updateFilter><v-icon>save</v-icon>save</v-btn>
          <v-btn @click=closeFilterDialog><v-icon>cancel</v-icon>cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  `,
  data(){
    return{
      dialog: false,
      filterEdittingItem: null,
      filterText: "",
      filterDialog: false,
      newItem:{
        type:"min-max-step", // can be set to "list" and "files"
        keyword: "",
        list:[],
        files: [],
        min:0,
        max:0,
        step:1,
      },
      currentItem: null,
      rules:{
        required(v){
          return v !== '' || 'must be number.';
        }
      },
      tableFooterProps
    };
  },
  props:["keyword", "params" ],
  methods:{
    openFilterDialog(item){
      this.filterEdittingItem=item;
      this.filterDialog=true;
      console.log("DEBUG:",this.filterEdittingItem)
    },
    updateFilter(){
      this.$emit("updateFilter",this.filterText)
      this.closeFilterDialog();
    },
    closeFilterDialog(){
      this.filterEdittingItem=null;
      this.filterDialog=false;
    },
    openDialog(item){
      this.currentItem=item;
      Object.assign(this.newItem, item);
      if(item.hasOwnProperty("list")){
        this.newItem.type="list";
        this.newItem.list=item.list.map((e)=>{return {item:e}});
      }else if(item.hasOwnProperty("files")){
        this.newItem.type="files";
        this.newItem.files=item.files.map((e)=>{return {item:e}});
      }else{
        this.newItem.type="min-max-step";
      }
      this.dialog=true;
    },
    deleteItem(item){
      removeFromArray(this.params,item);
    },
    removeFromArray(container, item){
      removeFromArray(container, item);
    },
    storeParam(target){
      if(this.newItem.type==="min-max-step"){
        const min=Number(this.newItem.min);
        const max=Number(this.newItem.max);
        const step=Number(this.newItem.step);
        if(Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)){
          console.log('min, max or step is Nan', min, max, step)
          //TODO エラーメッセージをトーストあたりで出す
          return;
        }
        target.min=min;
        target.max=max;
        target.step=step;
      }else if(this.newItem.type==="list"){
        target.list=this.newItem.list.map((e)=>{return e.item});
      }else if(this.newItem.type==="files"){
        target.files=this.newItem.files.map((e)=>{return e.item});
      }
    },
    addItem(){
      const newParam={keyword: this.keyword}
      this.params.push(newParam);
      this.storeParam(newParam);
      this.$emit("newParamAdded")
    },
    updateItem(item){
      const targetIndex = this.params.findIndex((e)=>{
        return e===item;
      });
      if(targetIndex === -1){
        return
      }
      this.storeParam(this.params[targetIndex]);
    },
    commitChange(){
      if(this.currentItem === null ){
        this.addItem();
      }else{
        this.updateItem(this.currentItem);
      }
      //clear all input value except for type prop
      const tmp=this.newItem.type;
      this.closeAndResetDialog();
      this.newItem.type=tmp;
    },
    closeAndResetDialog(){
      this.dialog=false;
      this.newItem={
        type:"min-max-step",
        list:[],
        files: [],
        min:0,
        max:0,
        step:1,
      },
      this.currentItem=null;
    },
  }
}

