import Vue from 'vue/dist/vue.esm.js';
import Vuetify from 'vuetify';
import Split from "split.js";
import 'vuetify/dist/vuetify.min.css'

Vue.use(Vuetify);

Vue.component("new-rapid", {
  template: `\
    <v-app dark>
      <v-container fill-height fluid>
        <v-layout split column id="text">
          <v-flex shrink>
            <v-tabs v-model="activeTab" @change="onChange">
              <v-tab v-for="(file,index) of files" :key="file.order">
                {{ file.name }}
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
                      <v-btn @click="newFilePrompt=false;openNewTab()"><v-icon>save</v-icon>save</v-btn>
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
      files: [
        { name: "file1", content: "foo" },
        { name: "file2", content: "bar" },
        { name: "file3", content: "baz" },
        { name: "file4", content: "hoge" }
      ],
      editor: null
    };
  },
  methods: {
    openNewTab(newContents = "") {
      //console.log("openNewTab called", this.newFilename, newContents)
      const newIndex = this.files.length;
      const newFile = {
        name: this.newFilename,
        content: newContents,
        editorSession: ace.createEditSession(newContents)
      };
      this.files.push(newFile);
      this.newFilename = null;
      //select tab after DOM updated
      this.$nextTick(function() {
        this.activeTab = newIndex;
      });
    },
    onChange(index) {
      //console.log("onChange called", index);
      if (index < this.files.length) {
        const session = this.files[index].editorSession;
        this.editor.setSession(session);
      } else {
        console.log("session not found for", index);
      }
    },
    closeTab(index) {
      //console.log("closeTab called", index);
      //TODO save file
      this.files.splice(index, 1);
    }
  },
  mounted() {
    this.editor = ace.edit("editor");
    this.editor.setOptions({
      theme: "ace/theme/idle_fingers",
      autoScrollEditorIntoView: true,
      highlightSelectedWord: true,
      highlightActiveLine: true
    });
    this.editor.on("changeSession", this.editor.resize.bind(this.editor));

    this.files.forEach((file)=>{
      file.editorSession = ace.createEditSession(file.content);
    });
    this.editor.setSession(this.files[this.activeTab].editorSession);
    Split(["#text", "#parameter"]);
  }
});
