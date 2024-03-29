/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */
<template>
  <div>
    <v-tabs
      v-model="activeTab"
      @change="changeTab"
    >
      <v-tab
        v-for="(file,index) of files"
        :key="file.order"
        class="text-none"
      >
        <v-menu
          offset-y
          close-on-content-click
          close-on-click
        >
          <template #activator="{on: menu,attrs}">
            <v-tooltip top>
              <template #activator="{on: tooltip}">
                <span
                  v-bind="attrs"
                  v-on="{...tooltip, ...menu}"
                >
                  {{ file.filename }}
                </span>
              </template>
              <span> {{ file.absPath }} </span>
            </v-tooltip>
          </template>
          <v-list>
            <v-list-item
              @click="save(index)"
            >
              save
            </v-list-item>
            <v-list-item
              @click="closeTab(index)"
            >
              close without save
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          small
          icon
          @click.stop="save(index).then(()=>closeTab(index))"
        >
          <v-icon small>
            mdi-close
          </v-icon>
        </v-btn>
      </v-tab>
      <v-tab @click.stop>
        <v-dialog v-model="newFilePrompt">
          <template #activator="{ on }">
            <v-btn
              icon
              v-on="on"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-text>
              <v-text-field
                v-model="newFilename"
                label="new file name"
                :rules="[isValidName]"
              />
            </v-card-text>
            <v-card-actions>
              <v-btn @click="openNewTab(newFilename);closeNewFileDialog()">
                <v-icon>mdi-pencil-outline</v-icon>open
              </v-btn>
              <v-btn @click="closeNewFileDialog">
                <v-icon>mdi-close</v-icon>cancel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-tab>
    </v-tabs>
    <v-card
      id="editor"
      grow
    />
  </div>
</template>

<script>
  "use strict";
  import { mapState, mapGetters, mapMutations } from "vuex";
  import SIO from "@/lib/socketIOWrapper.js";
  import { isValidInputFilename } from "@/lib/utility.js";
  import ace from "ace-builds";
  import "ace-builds/webpack-resolver";
  import "ace-builds/src-noconflict/theme-idle_fingers.js";

  export default {
    name: "TabEditor",
    props: {
      readOnly: {
        type: Boolean,
        required: true,
      },
    },
    data: function () {
      return {
        newFilePrompt: false,
        newFilename: null,
        activeTab: 0,
        files: [],
        editor: null,
      };
    },
    computed: {
      ...mapState(["selectedFile",
                   "selectedText",
                   "projectRootDir",
                   "componentPath",
                   "selectedComponent",
      ]),
      ...mapGetters(["pathSep", "selectedComponentAbsPath"]),
    },
    watch: {
      readOnly () {
        this.editor.setReadOnly(this.readOnly);
      },
    },
    mounted: function () {
      this.editor = ace.edit("editor");
      this.editor.setOptions({
        theme: "ace/theme/idle_fingers",
        autoScrollEditorIntoView: true,
        highlightSelectedWord: true,
        highlightActiveLine: true,
        readOnly: this.readOnly,
      });
      this.editor.on("changeSession", this.editor.resize.bind(this.editor));

      SIO.on("file", (file)=>{
        // check arraived file is already opened or not
        const existingTab = this.files.findIndex((e)=>{
          return e.filename === file.filename && e.dirname === file.dirname;
        });
        // just switch tab if arraived file is already opened
        if (existingTab !== -1) {
          this.activeTab = existingTab + 1;
          return;
        }
        // open new tab for arraived file
        file.editorSession = ace.createEditSession(file.content);
        file.absPath = `${file.dirname}${this.pathSep}${file.filename}`;
        this.files.push(file);

        // select last tab after DOM is updated
        this.$nextTick(function () {
          this.activeTab = this.files.length;
          const session = this.files[this.activeTab - 1].editorSession;
          this.editor.setSession(session);
          session.selection.on("changeSelection", ()=>{
            this.commitSelectedText(this.editor.getSelectedText());
          });
        });
      });

      if (typeof this.selectedFile === "string") {
        SIO.emit("openFile", this.selectedFile, false);
      }
    },
    methods: {
      ...mapMutations({ commitSelectedText: "selectedText" }),
      isValidName (v) {
        // allow . / - and alphanumeric chars
        return isValidInputFilename(v) || "invalid filename";
      },
      async openNewTab (filename, argDirname) {
        const dirname = argDirname || this.selectedComponentAbsPath;

        if (!isValidInputFilename(filename)) {
          return this.closeNewFileDialog();
        }
        const existingTab = this.files.findIndex((e)=>{
          return e.filename === filename && e.dirname === dirname;
        });
        if (existingTab === -1) {
          const absFilename = `${dirname}${this.pathSep}${filename}`;
          SIO.emit("openFile", absFilename, false, (rt)=>{
            if (!rt) {
              console.log("file open error!", rt);
            }
          });
        } else {
          this.activeTab = existingTab + 1;
          this.changeTab(existingTab + 1);
        }
      },
      closeNewFileDialog () {
        // clear temporaly variables and close prompt
        this.newFilename = null;
        this.newFilePrompt = false;
      },
      insertBraces () {
        // this function will be called from parent component
        const selectedRange = this.editor.getSelection().getRange();
        const session = this.editor.getSession();
        session.insert(selectedRange.end, " }}");
        session.insert(selectedRange.start, "{{ ");
        this.editor.getSelection().clearSelection();
      },
      save (index) {
        return new Promise((resolve, reject)=>{
          const file = this.files[index];
          const document = file.editorSession.getDocument();
          const content = document.getValue();
          if (file.content === content) {
            console.log("do not call 'saveFile' API because file is not changed. index=", index);
          }
          SIO.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
            if (!rt) {
              console.log("ERROR: file save failed:", rt);
              reject(rt);
            }
            file.content = content;
            resolve(rt);
          });
        });
      },
      hasChange () {
        for (const file of this.files) {
          const document = file.editorSession.getDocument();
          const content = document.getValue();
          if (file.content !== content) {
            return true;
          }
        }
        return false;
      },
      saveAll () {
        let changed = false;
        for (const file of this.files) {
          const document = file.editorSession.getDocument();
          const content = document.getValue();
          if (file.content === content) {
            console.log(`INFO: ${file.filename} is not changed.`);
          } else {
            changed = true;
            SIO.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
              if (!rt) {
                console.log("ERROR: file save failed:", rt);
              }
              file.content = content;
            });
          }
        }
        return changed;
      },
      closeTab (index) {
        if (index === 0) {
          const file = this.files[index];
          const document = file.editorSession.getDocument();
          document.setValue("");
        }
        this.files.splice(index, 1);
      },
      changeTab (argIndex) {
        if (argIndex === 0) {
          // just ignored
          return;
        }
        const index = argIndex - 1;
        if (index < this.files.length) {
          const session = this.files[index].editorSession;
          this.editor.setSession(session);
          this.commitSelectedText("");
          session.selection.on("changeSelection", ()=>{
            this.commitSelectedText(this.editor.getSelectedText());
          });
        }
      },
    },
  };
</script>
