"use strict";
import { tableFooterProps } from "./rapid2Util.js";

export default {
  template:`
  <div>
    <v-card>
      <v-toolbar>
        <v-toolbar-title> parameters </v-toolbar-title>
        <div class="flex-grow-1"></div>
        <v-text-field outlined readonly v-model="newParam.keyword"></v-text-field>
        <v-btn @click="resetParamInputForm();newParamInput=true" class="text-capitalize">
          <v-icon>add</v-icon>
          add new parameter
        </v-btn>
      </v-toolbar>
      <v-data-table
         dense
        :headers="[{value: 'keyword',sortable: true},{ text: 'Actions', value: 'action', sortable: false }]"
        :items="parameterSetting.params"
        :items-per-page="5"
        :footer-props="tableFooterProps"
      >
        <template v-slot:item.action="{ item }">
          <v-icon small class="mr-2" @click="editParam(item)" > edit </v-icon>
          <v-icon small @click="deleteItem(item,parameterSetting.params)" > delete </v-icon>
        </template>
      </v-data-table>
    </v-card>
    <v-card v-if="newParamInput">
      <v-card-title> <v-select outlined v-model="newParam.type" :items="['min-max-step', 'list','files']"></v-select></v-card-title>
      <v-card-text>
        <v-layout v-if="newParam.type==='min-max-step'">
          <v-text-field v-model="newParam.min" type="number" hint="min" persistent-hint></v-text-field>
          <v-text-field v-model="newParam.max" type="number" hint="max" persistent-hint></v-text-field>
          <v-text-field v-model="newParam.step" type="number" hint="step" persistent-hint></v-text-field>
        </v-layout>
        <div v-if="newParam.type==='list'">
        placeholder for list
          <v-data-table
          dense
          :headers="['item']"
          :items="newParamListTable"
          >
          <template slot="items" slot-scope="props">
          <td>
          <v-edit-dialog
          :return-value.sync="props.item.item"
          lazy
          >
          {{ props.item.item }}
          <v-text-field
          slot="input"
          v-model="props.item.item"
          label="edit"
          single-line
          >
          </v-text-field>
          </v-edit-dialog>
          </td>
          </template>
          </v-data-table>
        </div>
        <div v-if="newParam.type==='files'">
        placeholder for file
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click=addParam><v-icon>save</v-icon>save</v-btn>
        <v-btn @click="resetParamInputForm();newParamInput=false"><v-icon>cancel</v-icon>cancel</v-btn>
      </v-card-actions>
  </v-card>
   </div>
  `,
  data(){
    return{
      newParamInput: false,
      tableFooterProps
    }
  },
  props:["newParam", "parameterSetting" ],
  methods:{
    deleteItem(item, data, match){
      console.log("deleteItem called",item,data,match);
      if(typeof match !== "function"){
        match = (e)=>{return e===item}
      }
      const targetIndex = data.findIndex(match);
      if(targetIndex === -1){
        return
      }
      data.splice(targetIndex,1);
    },
    resetParamInputForm(){
      this.newParam.type="min-max-step";
      this.newParam.list=[];
      this.newParam.files=[];
      this.newParam.min=0;
      this.newParam.max=0;
      this.newParam.step=1;
    },
    addParam(){
      const newParam={keyword: this.newParam.keyword}
      if(this.newParam.type==="min-max-step"){
        newParam.min=this.newParam.min;
        newParam.max=this.newParam.max;
        newParam.step=this.newParam.step;
      }else if(this.newParam.type==="files"){
        newParam.files=this.newParam.files;
      }else if(this.newParam.type==="list"){
        newParam.list=this.newParam.list;
      }
      this.parameterSetting.params.push(newParam);
      const tmp=this.newParam.type;
      this.resetParamInputForm();
      this.newParam.type=tmp;
    },
  }
}

