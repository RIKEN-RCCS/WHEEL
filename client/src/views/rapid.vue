<!--
Copyright (c) Center for Computational Science, RIKEN All rights reserved.
Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
See License.txt in the project root for the license information.
-->
<template>
  <v-container
    class="fill-height"
    fluid
  >
    <v-fab-transition>
      <v-btn
        absolute
        fab
        right
        bottom
        elevation="5"
        @click="openParamEditor = !openParamEditor"
      >
        <v-icon>mdi-triangle {{ rotation }}</v-icon>
      </v-btn>
    </v-fab-transition>
    <v-toolbar dense>
      <v-spacer />
      <v-btn @click="saveAllFiles">
        <v-icon>mdi-content-save-all</v-icon>save all files
      </v-btn>
    </v-toolbar>
    <v-row no-gutters>
      <v-col>
        <tab-editor
          :parameter-setting="parameterSetting"
        />
      </v-col>
      <v-col v-if="openParamEditor">
        <parameter-editor
          :parameter-setting="parameterSetting"
        />
      </v-col>
    </v-row>
    <filter-editor />
    <unsaved-file-dialog />
  </v-container>
</template>
<script>

  "use strict"
  import unsavedFileDialog from "@/components/rapid/unsavedFileDialog.vue"
  import filterEditor from "@/components/rapid/filterEditor.vue"
  import tabEditor from "@/components/rapid/tabEditor.vue"
  import parameterEditor from "@/components/rapid/parameterEditor.vue"
  import SIO from "@/lib/socketIOWrapper.js"

  export default {
    beforeRouteLeave (to, from, next) {
      // check unsaved files
      // open save dialogue
      // if keep editting, do not call next, just return
      next()
    },
    name: "Editor",
    components: {
      unsavedFileDialog,
      filterEditor,
      tabEditor,
      parameterEditor,
    },
    data: ()=>{
      return {
        openParamEditor: true, // TODO routingパラメータで変更?
        parameterSetting:
          {
            version: 2,
            targetFiles: [],
            params: [],
            scatter: [],
            gather: [],
          },
      }
    },
    computed: {
      rotation: function () {
        return this.openParamEditor ? "mdi-rotate-90" : "mdi-rotate-270 "
      },
    },
    mounted () {
      SIO.on("parameterSettingFile", (file)=>{
        if (!file.isParameterSettingFile) {
          console.log("ERROR: illegal parameter setting file data", file)
          return
        }
        this.parameterSetting = JSON.parse(file.content)
        this.parameterSetting.targetFiles = this.parameterSetting.targetFiles.map((e)=>{
          if (typeof e === "string") {
            return { targetName: e }
          }
          return e
        })
        this.parameterSettingFilename = file.filename
        this.parameterSettingDirname = file.dirname
      })
    },
    methods: {
      saveAllFiles () {
        // tabEditorが開いているファイルを全部save
        // パラメータエディタもsave

        // refで各コンポーネントのメソッドを呼ぶ
      },
    },
  }
</script>
