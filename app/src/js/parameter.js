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
          <v-btn  small class="mr-2" @click="openFilterDialog(item)"><v-icon small class="mr-2"> edit </v-icon>add filter</v-btn>
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
            <v-text-field v-model="newItem.min" type="number" hint="min" persistent-hint></v-text-field>
            <v-text-field v-model="newItem.max" type="number" hint="max" persistent-hint></v-text-field>
            <v-text-field v-model="newItem.step" type="number" hint="step" persistent-hint></v-text-field>
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
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click=commitChange><v-icon>save</v-icon>save</v-btn>
          <v-btn @click=closeAndResetDialog><v-icon>cancel</v-icon>cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  `,
  data(){
    return{
      dialog: false,
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
      tableFooterProps
    }
  },
  props:["keyword", "params" ],
  methods:{
    openFilterDialog(item){
      this.filterDialog=true
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
        target.min=this.newItem.min;
        target.max=this.newItem.max;
        target.step=this.newItem.step;
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
      //keep type prop
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

