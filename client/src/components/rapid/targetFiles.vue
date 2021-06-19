/*
 * Copyright (c) Center for Computational Science, RIKEN All rights reserved.
 * Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
 * See License.txt in the project root for the license information.
 */

<template>
  <div>
    <v-card
      outlined
    >
      <v-card-title>
        targetFiles
        <v-row
          justify="end"
        >
          <v-btn
            class="text-capitalize"
            :disabled="readOnly"
            @click="openDialog"
          >
            <v-icon> mdi-plus</v-icon> add new target file
          </v-btn>
        </v-row>
      </v-card-title>
      <v-card-text>
        <v-data-table
          dense
          :headers="[{ value: 'targetName', text: 'filename', sortable: true },
                     { value: 'targetNode', text: 'component', sortable: true },
                     { value: 'action', text: 'Actions', sortable: false }]"
          :items="targetFiles"
          hide-default-footer
        >
          <template v-slot:item.action="{ item }">
            <action-row
              :item="item"
              @edit="openDialog(item)"
              @delete="deleteItem(item)"
            />
          </template>
          <template v-slot:item.targetNode="{ item }">
            <div v-if="item.hasOwnProperty('targetNode')">
              {{ getComponentName(item.targetNode) }}
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
    <v-dialog
      v-model="targetFileDialog"
      persistent
    >
      <v-card>
        <v-card-title>
          <span class="headline">target filename</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model.trim.lazy="newTargetFilename"
            :label="'filename'"
          />
          <lower-component-tree />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            text
            @click="commitTargetFileChange"
          >
            OK
          </v-btn>
          <v-btn
            text
            @click="closeAndResetDialog"
          >
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
  import { mapState, mapGetters } from "vuex"
  import { tableFooterProps, targetFile2absPath } from "@/lib/rapid2Util.js"
  import { removeFromArray } from "@/lib/clientUtility.js"
  import actionRow from "@/components/common/actionRow.vue"
  import lowerComponentTree from "@/components/lowerComponentTree.vue"

  export default {
    name: "TargetFiles",
    components: {
      actionRow,
      lowerComponentTree,
    },
    props: {
      targetFiles: {
        type: Array,
        required: true,
      },
      readOnly: {
        type: Boolean,
        required: true,
      },
    },
    data () {
      return {
        targetFileDialog: false,
        newTargetFilename: "",
        currentItem: null,
        active: [],
        tableFooterProps,
      }
    },
    computed: {
      ...mapState(["selectedText",
                   "projectRootDir",
                   "componentPath",
                   "selectedComponent",
      ]),
      ...mapGetters(["selectedComponentAbsPath", "pathSep"]),
    },
    methods: {
      getComponentName (id) {
        const name = this.componentPath[id]
        const tmp = name.split("/")
        return tmp[tmp.length - 1]
      },
      openDialog (item) {
        this.targetFileDialog = true
      },
      deleteItem (item) {
        removeFromArray(this.targetFiles, item)
      },
      closeAndResetDialog () {
        this.currentItem = null
        this.targetFileDialog = false
        this.newTargetFilename = ""
        this.active = []
      },
      commitTargetFileChange () {
        if (this.newTargetFilename === "") {
          // regard as canceled
          return this.closeAndResetDialog()
        }
        if (this.currentItem === null) {
          this.addNewTargetFile()
        } else {
          this.renameTargetFile(this.currentItem)
        }
        this.closeAndResetDialog()
      },
      renameTargetFile (item) {
        const dirnamePrefix = this.$root.$data.rootDir + this.pathSep
        const oldAbsPath = targetFile2absPath(item, this.$root.$data.componentPath, this.pathSep, dirnamePrefix, this.$root.$data.node.ID)
        const targetInTargetFiles = this.targetFiles.find((e)=>{
          return oldAbsPath === targetFile2absPath(e, this.$root.$data.componentPath, this.pathSep, dirnamePrefix, this.$root.$data.node.ID)
        })
        targetInTargetFiles.targetName = this.newTargetFilename

        if (this.active[0]) {
          targetInTargetFiles.targetNode = this.active[0]
        } else {
          delete targetInTargetFiles.targetNode
        }

        this.$emit("open-new-tab", this.newTargetFilename)
        this.closeAndResetDialog()
      },
      addNewTargetFile () {
        const dirnamePrefix = this.$root.$data.rootDir + this.pathSep
        const newAbsPath = targetFile2absPath({ targetName: this.newTargetFilename }, this.$root.$data.componentPath, this.pathSep, dirnamePrefix, this.$root.$data.node.ID)
        const targetInTargetFiles = this.targetFiles.findIndex((e)=>{
          return newAbsPath === targetFile2absPath(e, this.$root.$data.componentPath, this.pathSep, dirnamePrefix, this.$root.$data.node.ID)
        })

        if (targetInTargetFiles !== -1) {
          // just ignore if already exists
          if (this.active[0]) {
            this.targetFiles[targetInTargetFiles].targetNode = this.active[0]
          } else {
            delete this.targetFiles[targetInTargetFiles].targetNode
          }
          return
        }
        const newTarget = { targetName: this.newTargetFilename }
        if (this.active[0]) {
          newTarget.targetNode = this.active[0]
        }
        this.targetFiles.push(newTarget)

        console.log("emit open-new-tab event", this.newTargetFilename)
        this.$emit("open-new-tab", this.newTargetFilename)
        this.closeAndResetDialog()
      },
    },
  }
</script>
