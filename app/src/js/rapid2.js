import Split from "split.js";

Vue.component("new-rapid", {
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

          <v-card>
            <v-toolbar>
              <v-toolbar-title> targetFiles </v-toolbar-title>
              <div class="flex-grow-1"></div>
              <v-btn @click="targetFileDialog=true" class="text-capitalize"> <v-icon> add </v-icon> add new </v-btn>
            </v-toolbar>
            <v-data-table
               dense
              :headers="[ {value: 'targetName', text: 'filename', sortable: true}, { text: 'Actions', value: 'action', sortable: false }]"
              :items="parameterSetting.targetFiles"
              :items-per-page="5"
              :footer-props="tableFooterProps"
            >
              <template v-slot:item.action="{ item }">
                <v-icon small class="mr-2" @click="currentItem=item;targetFileDialog=true;" > edit </v-icon>
                <v-icon small @click="deleteItem(item,parameterSetting.targetFiles)" > delete </v-icon>
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
                <v-btn flat @click=commitTargetFileChange>OK</v-btn>
                <v-btn flat @click="newTargetFilename='';targetFileDialog=false;">Cancel</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

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

          <v-card>
            <v-toolbar>
              <v-toolbar-title> scatter </v-toolbar-title>
              <div class="flex-grow-1"></div>
              <v-btn @click="filenameDialog=True" class="text-capitalize"> <v-icon> add </v-icon> add new </v-btn>
            </v-toolbar>
            <v-data-table
               dense
              :headers="[ {value: 'dstName', text: 'dstName', sortable: true},
                          {value: 'srcName', text: 'srcName', sortable: true},
                          {value: 'dstNode', text: 'dstNode', sortable: true},
                          {value: 'action',  text: 'Actions',  sortable: false },]"
              :items="parameterSetting.scatter"
              :items-per-page="5"
              :footer-props="tableFooterProps"
            >
              <template v-slot:item.action="{ item }">
                <v-icon small class="mr-2" @click="editParam(item)" > edit </v-icon>
                <v-icon small @click="deleteItem(item,parameterSetting.scatter)" > delete </v-icon>
              </template>
            </v-data-table>
          </v-card>

          <v-card>
            <v-toolbar>
              <v-toolbar-title> gather </v-toolbar-title>
              <div class="flex-grow-1"></div>
              <v-btn @click="filenameDialog=True" class="text-capitalize"> <v-icon> add </v-icon> add new </v-btn>
            </v-toolbar>
            <v-data-table
               dense
              :headers="[ {value: 'srcName', text: 'srcName', sortable: true},
                          {value: 'dstName', text: 'dstName', sortable: true},
                          {value: 'srcNode', text: 'srcNode', sortable: true},
                          {value: 'action',  text: 'Actions',  sortable: false },]"
              :items="parameterSetting.gather"
              :items-per-page="5"
              :footer-props="tableFooterProps"
            >
              <template v-slot:item.action="{ item }">
                <v-icon small class="mr-2" @click="editParam(item)" > edit </v-icon>
                <v-icon small @click="deleteItem(item, parameterSetting.gather)" > delete </v-icon>
              </template>
            </v-data-table>
          </v-card>
        </v-layout>
      </v-container>
    </v-app>
`,
  data() {
    return {
      targetFileDialog: false,
      newTargetFilename: "",
      currentItem: null,
      activeTab: 0,
      newFilePrompt: false,
      newFilename: null,
      newParamInput: false,
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
      parameterSettingDirname: null,
      tableFooterProps: {
        showFirstLastPage: true,
        firstIcon: 'fast_rewind',
        lastIcon: 'fast_forward',
        prevIcon: 'navigate_before',
        nextIcon: 'navigate_next'
      }
    };
  },
  computed:{
    newParamListTable(){
      return this.newParam.list.map((e)=>{return {item: e}});
    }
  },
  methods: {
    commitTargetFileChange(){
      if(this.currentItem === null ){
        this.addNewTargetFile();
      }else{
        this.renameTargetFile(this.currentItem);
      }
      this.targetFileDialog=false;
    },
    renameTargetFile(item){
      console.log("DEBUG componentPath=",this.$root.$data.componentPath);
      console.log("DEBUG old item=",item);
      const targetInTargetFiles = this.parameterSetting.targetFiles.find((e)=>{
        console.log("DEBUG targetFile=", e);
        if( typeof item.targetNode === "undefined" || item.targetNode === e.targetNode){
          return e.targetName === item.targetName;
        }
        return false;
      });

      const targetInTab = this.files.find((e)=>{
        return e.targetName === item.filename;
      });
      targetInTab.filename = this.newTargetFilename;
    },
    addNewTargetFile(){
      const file={
        filename: this.newTargetFilename,
        dirname: this.$root.$data.fb.getRequestedPath(),
        content: ""
      }

      //just ignore if target file is already exists
      if(this.isTargetFile(file)){
      this.targetFileDialog=false;
        return;
      }

      //add new file only in client side
      this.files.push(file);
      //TODO targetNodeをユーザに指定させる
      this.parameterSetting.targetFiles.push({
        targetName: this.newTargetFilename
      });
      this.targetFileDialog=false;
    },
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
    isTargetFile(file){
      const currentComponentID=this.$root.$data.node.ID;
      const componentPath=this.$root.$data.componentPath;
      const currentComponentDir=componentPath[currentComponentID];
      const dirnamePrefix=this.$root.$data.rootDir+this.$root.$data.pathSep
      return this.parameterSetting.targetFiles.findIndex((e)=>{
        let dirname = e.hasOwnProperty("targetNode") ? componentPath[e.targetNode] : currentComponentDir;
        dirname=dirname.replace(/^\.\//,""); //remove prefix
        let fullPath =dirnamePrefix+dirname+this.$root.$data.pathSep+e.targetName;
        if(this.$root.$data.pathSep==="\\"){
          fullPath=fullPath.replace("/",this.$root.$data.pathSep);
        }
        return fullPath===file.dirname+this.$root.$data.pathSep+file.filename;
      }) !== -1;
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
