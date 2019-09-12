"use strict";
import {tableFooterProps, removeFromArray, isTargetFile, targetFile2absPath, file2absPath} from "./rapid2Util.js";

export default {
  template:`
  <div>
    <v-card>
      <v-toolbar>
        <v-toolbar-title> targetFiles </v-toolbar-title>
        <div class="flex-grow-1"></div>
        <v-btn @click="targetFileDialog=true" class="text-capitalize"> <v-icon> add </v-icon> add new </v-btn>
      </v-toolbar>
      <v-data-table
         dense
        :headers="[ {value: 'targetName', text: 'filename', sortable: true}, { text: 'Actions', value: 'action', sortable: false }]"
        :items="targetFiles"
        :items-per-page="5"
        :footer-props="tableFooterProps"
      >
        <template v-slot:item.action="{ item }">
          <v-icon small class="mr-2" @click="currentItem=item;targetFileDialog=true;" > edit </v-icon>
          <v-icon small @click="deleteItem(item)" > delete </v-icon>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="targetFileDialog" persistent>
      <v-card>
        <v-card-title>
          <span class="headline">target filename</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
          v-model.trim.lazy="newTargetFilename"
          :label="'filename'"
          >
          </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click=commitTargetFileChange>OK</v-btn>
          <v-btn text @click=closeAndResetDialog>Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  `,
  props: ['files', 'targetFiles'],
  data(){
    return{
      targetFileDialog: false,
      newTargetFilename: "",
      currentItem: null,
      tableFooterProps
    }
  },
  methods:{
    deleteItem(item){
      removeFromArray(this.targetFiles, item);
    },
    closeAndResetDialog(){
      this.currentItem=null;
      this.targetFileDialog=false;
      this.newTargetFilename="";
    },
    commitTargetFileChange(){
      if(this.currentItem === null ){
        this.addNewTargetFile();
      }else{
        this.renameTargetFile(this.currentItem);
      }
      this.closeAndResetDialog();
    },
    renameTargetFile(item){
      const dirnamePrefix=this.$root.$data.rootDir+this.$root.$data.pathSep
      const oldAbsPath=targetFile2absPath(item, this.$root.$data.componentPath, this.$root.$data.pathSep, dirnamePrefix, this.$root.$data.node.ID);
      const targetInTargetFiles = this.targetFiles.find((e)=>{
        return oldAbsPath === targetFile2absPath(e, this.$root.$data.componentPath, this.$root.$data.pathSep, dirnamePrefix, this.$root.$data.node.ID);
      });
      targetInTargetFiles.targetName=this.newTargetFilename;

      this.$emit('open-new-tab', this.newTargetFilename);
      this.closeAndResetDialog();
    },
    addNewTargetFile(){
      const dirnamePrefix=this.$root.$data.rootDir+this.$root.$data.pathSep
      const newAbsPath=targetFile2absPath({targetName: this.newTargetFilename}, this.$root.$data.componentPath, this.$root.$data.pathSep, dirnamePrefix, this.$root.$data.node.ID);
      const targetInTargetFiles = this.targetFiles.findIndex((e)=>{
        return newAbsPath === targetFile2absPath(e, this.$root.$data.componentPath, this.$root.$data.pathSep, dirnamePrefix, this.$root.$data.node.ID);
      });

      if(targetInTargetFiles !== -1){
        //just ignore if already exists
        return
      }
      this.targetFiles.push({
        targetName: this.newTargetFilename
      });

      console.log("emit open-new-tab event", this.newTargetFilename);
      this.$emit('open-new-tab', this.newTargetFilename);
      this.closeAndResetDialog();
    },
  }
}
