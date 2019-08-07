import Split from "split.js";

Vue.component("new-rapid", {
  template: `
    <v-app dark>
      <v-container fill-height fluid>
        <v-layout split column id="text">
          <v-flex shrink>
            <v-tabs v-model="activeTab" @change="changeTab">
              <v-tab v-for="(file,index) of files" :key="file.order">
                {{ file.filename }}
                <v-btn small icon @click.stop="closeTab(index)">
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
          parameter editor
        </v-layout>
      </v-container>
    </v-app>
`,
  data() {
    return {
      activeTab: 0,
      newFilePrompt: false,
      newFilename: null,
      files: [],
      editor: null
    };
  },
  methods: {
    async openNewTab(newContents = "") {
      //memo Vuexを導入してそちらのactionにsocketIOの通信をまとめる方が望ましい
      const currentDir = this.$root.$data.fb.getRequestedPath();
      console.log("DEBUG: open new tab", this.newFilename, currentDir);
      const existingTab = this.files.findIndex((e)=>{
        console.log(e);
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
    //editorのセッションが全部一緒になってしもとる
    this.$root.$data.sio.on("file", (file)=>{
      console.log("DEBUG: file recieved",file.filename);
      file.editorSession=ace.createEditSession(file.content)
      this.files.push(file);

      //select last tab after DOM is updated
      this.$nextTick(function () {
        this.activeTab = this.files.length;
        const index=this.activeTab -1
        console.log("DEBUG: open files[",index,"]");
        this.editor.setSession(this.files[index].editorSession);
      });
    });
    const currentDir = this.$root.$data.fb.getRequestedPath();
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
