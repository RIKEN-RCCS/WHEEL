"use strict";
import Split from "split.js";
import targetFiles from "./targetFiles.js";
import gatherScatter from "./gatherScatter.js";
import parameter from "./parameter.js";
import {tableFooterProps,isTargetFile} from "./rapid2Util.js";

/**
 * check if given PS setting is differ from original one
 * @param {Object} psSetting - parameter setting object
 * @return {boolean} - psSetting is changed or not
 * 
 * this function just compare with default value for now.
 */
function isChanged(psSetting){
  if(psSetting.targetFiles.length > 0){
    return true
  }
  if(psSetting.params.length > 0){
    return true
  }
  if(psSetting.scatter.length > 0){
    return true
  }
  if(psSetting.gather.length > 0){
    return true
  }
  return false;
}

Vue.component("new-rapid", {
  components:{
    targetFiles,
    gatherScatter,
    parameter
  },
  template: `
    <v-app>
      <v-container fill-height fluid>
      <v-dialog v-model="filterEditor" persistent>
       <v-card>
       <v-card-title>
           <v-text-field
           v-model="newFilter"
           label="filter"
           ></v-text-field>
           <v-btn @click=applyFilter class="text-capitalize"> <v-icon>add</v-icon> apply </v-btn>
           <v-spacer></v-spacer>
           <v-text-field
           v-model="search"
           append-icon="mdi-magnify"
           label="Search"
           single-line
          ></v-text-field>
           <v-btn @click=closeFilterEditor class="text-capitalize"> <v-icon>close</v-icon> close </v-btn>
       </v-card-title>
       <v-card-text>
          <v-data-table
             dense
             show-select
             :single-select=false
             v-model="selected"
             :search="search"
             :headers="[{ value: 'text',     text: 'placeholder',  sortable: true },
                        { value: 'filename', text: 'filename', sortable: true, filterable: false },
                        { value: 'row',      text: 'row', sortable: true, filterable: false}, 
                        { value: 'column',   text: 'column',  sortable: true, filterable: false} ]"
             :items="placeholders"
             :items-per-page="5"
             :footer-props="tableFooterProps"
          ></v-data-table>
       </v-card-text>
    </v-card>
      </v-dialog>
      <v-dialog v-model="dialog" persistent>
        <v-card>
          <v-card-title>
          unsaved file
          </v-card-title>
          <v-card-text>
            {{ closingFilename }} is not saved
          </v-card-text>
          <v-card-actions>
          <v-btn text @click.stop=saveAndCloseTab ><v-icon>save</v-icon> save </v-btn>
          <v-btn text @click.stop=closeTab><v-icon>delete</v-icon> discard changes </v-btn>
          <v-btn text @click.stop=closeDialog><v-icon>cancel</v-icon> cancel </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
        <v-layout split column id="text">
          <v-flex shrink>
            <v-tabs v-model="activeTab" @change="changeTab">
              <v-tab class="text-none" v-for="(file,index) of files" :key="file.order">
                {{ file.filename }}
                <v-btn small icon @click.stop="openDialog(index)" v-if="! isTargetFile(file)">
                  <v-icon small>close</v-icon>
                </v-btn>
              </v-tab>
              <v-tab @click.stop>
                <v-dialog v-model="newFilePrompt">
                  <template v-slot:activator="{ on }">
                    <v-btn icon v-on="on"><v-icon>add</v-icon></v-btn>
                  </template>
                  <v-card>
                    <v-card-text>
                      <v-text-field v-model="newFilename" label="new file name"></v-text-field>
                    </v-card-text>
                    <v-card-actions>
                      <v-btn @click="openNewTab(newFilename)"><v-icon>create</v-icon>open</v-btn>
                      <v-btn @click="newFilename=null;newFilePrompt=false"><v-icon>cancel</v-icon>cancel</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-tab>
            </v-tabs>
          </v-flex>
          <v-flex grow id="editor">
          </v-flex>
        </v-layout>

        <v-layout split id="parameter" column>
        <v-btn @click="saveAllFiles"><v-icon>save</v-icon>save all files</v-btn>
          <target-files
            :files="files"
            :targetFiles="parameterSetting.targetFiles"
            :lowerLevelComponents="lowerLevelComponents"
            @open-new-tab="openNewTab"
          ></target-files>
          <parameter
          :keyword="selectedText"
          :params="parameterSetting.params"
          @newParamAdded="insertBraces"
          @openFilterEditor="openFilterEditor"
          ></parameter>

          <gather-scatter
          :container="parameterSetting.scatter"
          :lowerLevelComponents="lowerLevelComponents"
          :title="'scatter'"
          :counterpartProp="'dstNode'"
          ></gather-scatter>

          <gather-scatter
          :container="parameterSetting.gather"
          :lowerLevelComponents="lowerLevelComponents"
          :title="'gather'"
          :counterpartProp="'srcNode'"
          ></gather-scatter>

        </v-layout>
      </v-container>
    </v-app>
`,
  data() {
    return {
      dialog: false,
      placeholders: [],
      selected:[],
      newFilter: "",
      search: "",
      filterEditor: false,
      closingTab: null,
      closingFilename: null,
      activeTab: 0,
      newFilePrompt: false,
      newFilename: null,
      selectedText: null,
      files: [],
      editor: null,
      parameterSetting: {
        version: 2,
        targetFiles:[],
        params:[],
        scatter:[],
        gather:[]
      },
      parameterSettingFilename: "parameterSetting.json", //default new param setting filename
      parameterSettingDirname: null,
      tableFooterProps
    };
  },
  computed:{
    lowerLevelComponents(){
      const PSDir = this.$root.$data.componentPath[this.$root.$data.node.ID];
      const reversePathMap = Object.entries(this.$root.$data.componentPath)
        .filter(([k,v])=>{
          return v.startsWith(PSDir)
        })
        .map(([k,v])=>{
          const level=v.split('/').length - 1
          return {id: k, path: v, level}
        });
      let copiedMap = Array.from(reversePathMap);
      copiedMap.sort((r,l)=>{
        return r.path > l.path ? 1 : -1;
      });
      const root = copiedMap.shift();
      const rt=[];
      let currentContainer = rt
      let currentLevel= root.level + 1;
      let currentPath= root.path;
      let previousPath=currentPath;
      for(const e of copiedMap){
        if(e.level === currentLevel){
          //sibling
          const relPath = e.path.replace(currentPath+'/','');
          currentContainer.push({id: e.id, name:relPath, children:[]});
        }else if( e.level === currentLevel +1){
          //children
          currentPath=previousPath;
          currentContainer=currentContainer[currentContainer.length-1].children;
          const relPath = e.path.replace(currentPath+'/','');
          currentContainer.push({id: e.id, name:relPath, children:[]});
        }else{
          //reset!!
          currentContainer=rt;
          currentLevel= root.level + 1;
          currentPath = root.path;
          previousPath=currentPath;

          const splitedPath = e.path.split('/');
          splitedPath.shift(); // drop '.'
          splitedPath.shift(); // drop PS directory
          for(const dir of splitedPath){
            const target = currentContainer.find((e2)=>{
              return e2.name=== dir
            });
            if(typeof target === "undefined"){
              break;
            }
            currentContainer=target.children
            currentPath+='/'+target.name;
          }
          const relPath = e.path.replace(currentPath+'/','');
          currentContainer.push({id: e.id, name:relPath, children:[]});
        }
        currentLevel=e.level;
        previousPath=e.path;
      }
      return rt;
    }
  },
  methods: {
    updatePlaceholderList(){
      this.editor.$search.setOptions({
        needle: /{{.*}}/,
        regExp: true,
        wrap: true,
      }); 
      let i=0;
      this.placeholders=[];
      for(const file of this.files){
        const placeholders_in_file= this.editor.$search.findAll(file.editorSession)
        .map((e)=>{
          return {
            range: e,
            text: file.editorSession.getTextRange(e)
          }
        });
        if(placeholders_in_file .length == 0){
          continue;
        }
        for(const ph of placeholders_in_file){
          this.placeholders.push({
            filename: file.filename,
            editorSession: file.editorSession,
            row: ph.range.start.row,
            column: ph.range.start.column,
            row_end: ph.range.end.row,
            column_end: ph.range.end.column,
            text: ph.text,
            id:i++
          });
        }
      }
    },
    openFilterEditor(){
      this.filterEditor=true;
      this.updatePlaceholderList();
    },
    applyFilter(){
     const placeholders = Array.from(this.selected)
     placeholders.sort((a,b)=>{
       if(a.filename === b.filename){
         return a.row_end - b.row_end !== 0 ? b.row_end - a.row_end : b.column_end - a.column_end
       }
       return a.filename > b.filename ? 1 : -1
     })
     const filter = "| "+this.newFilter + " ";
     placeholders.forEach((ph)=>{
       ph.editorSession.insert({row: ph.row_end, column: ph.column_end - 2}, filter);
     });
     console.log(placeholders); //DEBUG
     this.updatePlaceholderList();
    },
    closeFilterEditor(){
      this.filterEditor=false;
      this.params=null;
    },
    insertBraces(){
      console.log("DEBUG: insertBraces called")
      const selectedRange =this.editor.getSelection().getRange();
      const session = this.editor.getSession();
      session.insert(selectedRange.end, " }}");
      session.insert(selectedRange.start, "{{ ");
    },
    getComponentName(id){
      const name = this.$root.$data.componentPath[id]; 
      const tmp=name.split('/');
      return tmp[tmp.length -1]
    },
    async saveAllFiles(){
      //save parameter setting file
      if(isChanged(this.parameterSetting)){
        const PSFileContent=JSON.stringify(this.parameterSetting, null,4);
        this.$root.$data.sio.emit("saveFile", this.parameterSettingFilename, this.parameterSettingDirname, PSFileContent, (rt)=>{
          if(! rt){
            console.log("ERROR: file save failed:", rt);
          }
        });
      }else{
        console.log(`INFO: ${this.parameterSettingFilename} is not changed. so it will not saved`);
      }
      //save other files
      for(const file of this.files){
        const document = file.editorSession.getDocument()
        const content = document.getValue();
        if(file.content === content){
          console.log(`INFO: ${file.filename} is not changed. so just close tab`);
        }else{
          this.$root.$data.sio.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
            if(! rt){
              console.log("ERROR: file save failed:", rt);
            }
          });
        }
      }
    },
    async openNewTab(newFilename) {
      const currentDir = this.$root.$data.fb.getRequestedPath();
      console.log("DEBUG: open new tab", newFilename, currentDir);
      const existingTab = this.files.findIndex((e)=>{
        return e.filename === newFilename && e.dirname === currentDir
      });
      if(existingTab === -1){
        this.$root.$data.sio.emit("openFile", newFilename, currentDir, false, (rt)=>{
          if(!rt){
            console.log("file open error!",rt);
            return
          }
        });
      }else{
        this.activeTab=existingTab+1;
        this.changeTab(existingTab+1);
      }
      //clear temporaly variables and close prompt
      this.newFilename = null;
      this.newFilePrompt=false;
    },
    changeTab(argIndex) {
      if(argIndex === 0){
        //just ignored
        return
      }
      const index = argIndex-1
      if (index < this.files.length) {
        console.log("DEBUG: tab changed to ", argIndex, "(1-origin)");
        const session = this.files[index].editorSession;
        this.editor.setSession(session);
        this.selectedText=""
        session.selection.on('changeSelection', ()=>{
          this.selectedText=this.editor.getSelectedText();
          console.log("DEBUG: selection",this.selectedText)
         });
      }
    },
    openDialog(index){
      this.closingTab=index;
      const file = this.files[index];
      this.closingFilename=file.filename;
      const document = file.editorSession.getDocument()
      const content = document.getValue();
      if(file.content === content){
        console.log(`INFO: ${file.filename} is not changed. so just close tab`);
        this.closeTab();
        return
      }
      // open dialog and ask user how to treat this file
      this.dialog=true;
    },
    closeDialog(){
      this.closingTab=null;
      this.dialog=false;
    },
    saveAndCloseTab(){
      const index=this.closingTab;
      const file = this.files[index];
      const document = file.editorSession.getDocument()
      const content = document.getValue();
      this.$root.$data.sio.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
        if(! rt){
          console.log("ERROR: file save failed:", rt);
        }
      });
      this.closeTab();
    },
    closeTab() {
      const index = this.closingTab;
      console.log("DEBUG: close ",index,"th tab");
      if(index === 0){
        const file = this.files[index];
        const document = file.editorSession.getDocument()
        document.setValue("");
      }
      this.files.splice(index, 1);
      this.closeDialog();
    },
    isTargetFile(file){
      return isTargetFile(file, this.$root.$data.rootDir, this.$root.$data.pathSep, this.parameterSetting.targetFiles, this.$root.$data.componentPath, this.$root.$data.node.ID);
    }
  },
  mounted() {
    this.$root.$data.sio.on("parameterSettingFile", (file)=>{
      console.log("DEBUG: parameter setting file recieved");
      if(!file.isParameterSettingFile){
        console.log("ERROR: illegal parameter setting file data",file);
        return
      }
      const parameterSetting=JSON.parse(file.content);
      parameterSetting.targetFiles=parameterSetting.targetFiles.map((e)=>{
        if(typeof e === "string"){
          return {targetName: e}
        }
        return e;
      });
      this.parameterSetting=parameterSetting;
      this.parameterSettingFilename=file.filename;
      this.parameterSettingDirname=file.dirname;
    });
    this.$root.$data.sio.on("file", (file)=>{
      console.log("DEBUG: file recieved",file.filename);
      //check arraived file is already opened or not
      const existingTab = this.files.findIndex((e)=>{
        return e.filename === file.filename
      });
      if(existingTab !== -1){
          this.activeTab = existingTab
          return
      }
      file.editorSession=ace.createEditSession(file.content)
      this.files.push(file);

      //select last tab after DOM is updated
      this.$nextTick(function () {
        this.activeTab = this.files.length;
        const index=this.activeTab -1
        console.log("DEBUG: open files[",index,"]");
        const session = this.files[index].editorSession
        this.editor.setSession(session);
        this.selectedText=""
        session.selection.on('changeSelection', ()=>{
          this.selectedText=this.editor.getSelectedText();
          console.log("DEBUG: selection",this.selectedText)
         });
      });
    });
    const currentDir = this.$root.$data.fb.getRequestedPath();
    this.parameterSettingDirname=currentDir;
    const selectedFile = this.$root.$data.fb.getSelectedFile();
    this.$root.$data.sio.emit("openFile",selectedFile, currentDir, false, (isOK)=>{
      console.log("DEBUG: open ",selectedFile,isOK);
    });
    this.editor = ace.edit("editor");
    this.editor.setOptions({
      theme: "ace/theme/idle_fingers",
      autoScrollEditorIntoView: true,
      highlightSelectedWord: true,
      highlightActiveLine: true
    });
    this.editor.on("changeSession", this.editor.resize.bind(this.editor));
    Split(["#text", "#parameter"]);
  }
});
