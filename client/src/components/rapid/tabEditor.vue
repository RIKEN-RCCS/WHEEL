<!--
Copyright (c) Center for Computational Science, RIKEN All rights reserved.
Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
See License.txt in the project root for the license information.
-->
<template>
  <v-container
    class="grow align"
  >
    <v-tabs
      v-model="activeTab"
      @change="changeTab"
    >
      <v-tab
        v-for="(file,index) of files"
        :key="file.order"
        class="text-none"
      >
        {{ file.filename }}
        <v-btn
          :disabled="isTargetFile(file)"
          small
          icon
          @click.stop="saveAndCloseTab(index)"
        >
          <v-icon small>
            mdi-close
          </v-icon>
        </v-btn>
      </v-tab>
      <v-tab @click.stop>
        <v-dialog v-model="newFilePrompt">
          <template v-slot:activator="{ on }">
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
              <v-btn @click="openNewTab">
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
  </v-container>
</template>

<script>
  "use strict"
  import { mapState, mapGetters, mapMutations } from "vuex"
  import SIO from "@/lib/socketIOWrapper.js"
  import { isValidName } from "@/lib/utility.js"
  import ace from "ace-builds"
  import "ace-builds/webpack-resolver"
  import "ace-builds/src-noconflict/theme-idle_fingers.js"

  export default {
    name: "TabEditor",
    props: {
      parameterSetting: Object,
    },
    data: function () {
      return {
        newFilePrompt: false,
        newFilename: null,
        activeTab: 0,
        files: [],
      }
    },
    mounted: function () {
      this.editor = ace.edit("editor")
      this.editor.setOptions({
        theme: "ace/theme/idle_fingers",
        autoScrollEditorIntoView: true,
        highlightSelectedWord: true,
        highlightActiveLine: true,
      })
      this.editor.on("changeSession", this.editor.resize.bind(this.editor))

      SIO.on("file", (file)=>{
        // check arraived file is already opened or not
        const existingTab = this.files.findIndex((e)=>{
          return e.filename === file.filename
        })
        // just switch tab if arraived file is already opened
        if (existingTab !== -1) {
          this.activeTab = existingTab
          return
        }
        // open new tab for arraived file
        file.editorSession = ace.createEditSession(file.content)
        file.absPath = `${file.dirname}${this.pathSep}${file.filename}`
        this.files.push(file)

        // select last tab after DOM is updated
        this.$nextTick(function () {
          this.activeTab = this.files.length
          const index = this.activeTab - 1
          console.log("DEBUG: open files[", index, "]")
          const session = this.files[index].editorSession
          this.editor.setSession(session)
          session.selection.on("changeSelection", ()=>{
            this.commitSelectedText(this.editor.getSelectedText())
          })
        })
      })
      SIO.emit("openFile", this.selectedFile, this.currentDir, false)
    },
    computed: {
      ...mapState(["selectedFile",
                   "currentDir",
                   "selectedText",
                   "projectRootDir",
                   "componentPath",
                   "selectedComponent",
      ]),
      ...mapGetters(["pathSep", "selectedComponentAbsPath"]),
      targetFiles () {
        if (!this.parameterSetting || !this.parameterSetting.targetFiles) {
          console.log(this.parameterSetting)
          return []
        }
        if (typeof this.parameterSetting.targetFiles === "string") {
          return [`${this.selectedComponentAbsPath}${this.pathSep}${this.parameterSetting.targetFiles}`]
        }
        return this.parameterSetting.targetFiles.map((e)=>{
          const dirname = e.targetNode ? this.componentPath[e.targetNode].slice(1) : this.selectedComponentAbsPath
          const filename = e.targetName || e
          return `${this.projectRootDir}${dirname}${this.pathSep}${filename}`
        })
      },
    },
    methods: {
      ...mapMutations({ commitSelectedText: "selectedText" }),
      isValidName (v) {
        return isValidName(v) || "invalid filename"
      },
      isTargetFile (file) {
        return this.targetFiles.includes(file.absPath)
      },
      async openNewTab () {
        if (!isValidName(this.newFilename)) {
          return this.closeNewFileDialog()
        }
        const existingTab = this.files.findIndex((e)=>{
          return e.filename === this.newFilename && e.dirname === this.currentDir
        })
        if (existingTab === -1) {
          SIO.emit("openFile", this.newFilename, this.currentDir, false, (rt)=>{
            if (!rt) {
              console.log("file open error!", rt)
            }
          })
        } else {
          this.activeTab = existingTab + 1
          this.changeTab(existingTab + 1)
        }
      },
      closeNewFileDialog () {
        // clear temporaly variables and close prompt
        this.newFilename = null
        this.newFilePrompt = false
      },
      insertBraces () {
        const selectedRange = this.editor.getSelection().getRange()
        const session = this.editor.getSession()
        session.insert(selectedRange.end, " }}")
        session.insert(selectedRange.start, "{{ ")
      },
      saveAndCloseTab (index) {
        const file = this.files[index]
        const document = file.editorSession.getDocument()
        const content = document.getValue()
        SIO.emit("saveFile", file.filename, file.dirname, content, (rt)=>{
          if (!rt) {
            console.log("ERROR: file save failed:", rt)
          }
          this.closeTab(index)
        })
      },
      closeTab (index) {
        console.log("DEBUG: close ", index, "th tab")

        if (index === 0) {
          const file = this.files[index]
          const document = file.editorSession.getDocument()
          document.setValue("")
        }
        this.files.splice(index, 1)
      },
      changeTab (argIndex) {
        if (argIndex === 0) {
          // just ignored
          return
        }
        const index = argIndex - 1
        if (index < this.files.length) {
          const session = this.files[index].editorSession
          this.editor.setSession(session)
          this.commitSelectedText("")
          session.selection.on("changeSelection", ()=>{
            this.commitSelectedText(this.editor.getSelectedText())
          })
        }
      },
    },
  }
</script>
