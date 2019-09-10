"use strict";
import Split from "split.js";
import targetFiles from "./targetFiles.js";
import gatherScatter from "./gatherScatter.js";
import parameter from "./parameter.js";
import {isTargetFile} from "./rapid2Util.js";

Vue.component("new-rapid", {
  components:{
    targetFiles,
    gatherScatter,
    parameter
  },
  template: `
    <v-app>
      <v-container fill-height fluid>
        <v-layout split column id="text">
          <v-flex shrink>
            <v-tabs v-model="activeTab" @change="changeTab">
              <v-tab v-for="(file,index) of files" :key="file.order">
                {{ file.filename }}
                <v-btn small icon @click.stop="closeTab(index)" v-if="! isTargetFile(file)">
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
                      <v-btn @click="openNewTab()"><v-icon>create</v-icon>open</v-btn>
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
          <target-files
            :files="files"
            :targetFiles="parameterSetting.targetFiles"
          :lowerLevelComponents="lowerLevelComponents"
          ></target-files>
          <parameter
          :newParam="newParam"
          :parameterSetting="parameterSetting"
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
      activeTab: 0,
      newFilePrompt: false,
      newFilename: null,
      newParam:{
        type:"min-max-step", // can be set to "list" and "files"
        keyword: "",
        list:[],
        files: [],
        min:0,
        max:0,
        step:1,
      },
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
      parameterSettingDirname: null
    };
  },
  computed:{
    newParamListTable(){
      return this.newParam.list.map((e)=>{return {item: e}});
    },
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
    async openNewTab(newContents = "") {
      const currentDir = this.$root.$data.fb.getRequestedPath();
      console.log("DEBUG: open new tab", this.newFilename, currentDir);
      const existingTab = this.files.findIndex((e)=>{
        return e.filename === this.newFilename && e.dirname === currentDir
      });
      if(existingTab === -1){
        this.$root.$data.sio.emit("openFile",this.newFilename, currentDir, false, (rt)=>{
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
        this.newParam.keyword=""
        session.selection.on('changeSelection', ()=>{
          this.newParam.keyword=this.editor.getSelectedText();
          console.log("DEBUG: selection",this.newParam.keyword)
         });
      }
    },
    closeTab(index) {
      console.log("DEBUG: close ",index,"th tab");
      const file = this.files[index];
      const document = file.editorSession.getDocument()
      //TODO 差分が無ければsaveFileを呼ばないようにする
      const content = document.getValue();
      this.$root.$data.sio.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
        if(! rt){
          console.log("ERROR: file save failed:", rt);
        }
      });
      if(index === 0){
        document.setValue("");
      }
      this.files.splice(index, 1);
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
      file.editorSession=ace.createEditSession(file.content)
      this.files.push(file);

      //select last tab after DOM is updated
      this.$nextTick(function () {
        this.activeTab = this.files.length;
        const index=this.activeTab -1
        console.log("DEBUG: open files[",index,"]");
        const session = this.files[index].editorSession
        this.editor.setSession(session);
        this.newParam.keyword=""
        session.selection.on('changeSelection', ()=>{
          this.newParam.keyword=this.editor.getSelectedText();
          console.log("DEBUG: selection",this.newParam.keyword)
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
