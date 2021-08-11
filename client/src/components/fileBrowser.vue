<template>
  <div>
    <div v-if="! readonly">
      <v-spacer />
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="openDialog('createNewDir')"
            >
              mdi-folder-plus-outline
            </v-icon>
          </v-btn>
        </template>
        new folder
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="openDialog('createNewFile')"
            >
              mdi-file-plus-outline
            </v-icon>
          </v-btn>
        </template>
        new file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="createNewJobScript('newJobscript')"
            >
              mdi-file-document-edit-outline
            </v-icon>
          </v-btn>
        </template>
        create job script file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="openDialog('renameFile')"
            >
              mdi-file-move-outline
            </v-icon>
          </v-btn>
        </template>
        rename
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="openDialog('removeFile')"
            >
              mdi-file-remove-outline
            </v-icon>
          </v-btn>
        </template>
        delete
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="showUploadDialog"
            >
              mdi-upload
            </v-icon>
          </v-btn>
        </template>
        upload file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-btn>
            <v-icon
              v-bind="attrs"
              v-on="on"
              @click="shareFile"
            >
              mdi-share-outline
            </v-icon>
          </v-btn>
        </template>
        share file
      </v-tooltip>
      <v-progress-linear
        v-show="uploading"
        value="percentUploaded"
      />
    </div>
    <v-treeview
      :active.sync="activeItems"
      :items="items"
      :load-children="getChildren"
      activatable
      :open="openItems"
      @update:active="updateSelected"
    >
      <template v-slot:prepend="{item, open}">
        <v-icon v-if="item.children !== null">
          {{ open ? openIcons[item.type] : icons[item.type] }}
        </v-icon>
        <v-icon v-else>
          {{ icons[item.type] }}
        </v-icon>
      </template>
    </v-treeview>
    <v-dialog
      v-model="dialog.open"
      persistent
      max-width="300"
    >
      <v-card>
        <v-card-title>
          {{ dialog.title }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-if="dialog.withInputField"
            v-model="dialog.inputField"
            :label="dialog.inputFieldLabel"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            @click="submitAndCloseDialog"
          >
            OK
          </v-btn>
          <v-btn
            @click="clearAndCloseDialog"
          >
            cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script src="/siofu/client.js"></script>
<script>
  import { mapState, mapGetters, mapMutations } from "vuex"
  import SIO from "@/lib/socketIOWrapper.js"
  import { removeFromArray } from "@/lib/clientUtility.js"

  function fileListModifier (pathsep, e) {
    const rt = {
      id: `${e.path}${pathsep}${e.name}`,
      path: e.path,
      name: e.name,
      type: `${e.type}${e.islink ? "-link" : ""}`,
    }
    if (["dir", "dir-link", "snd", "snd-link", "sndd", "sndd-link"].includes(e.type)) {
      rt.children = []
    }
    return rt
  }

  function removeItem (items, key) {
    for (const item of items) {
      if (item.id === key) {
        removeFromArray(items, { id: key }, "id")
        return true
      }
      if (Array.isArray(item.children) && item.children.length > 0) {
        const found = removeItem(item.children, key)
        if (found) {
          return true
        }
      }
    }
  }
  function getActiveItem (items, key, path) {
    for (const item of items) {
      if (Array.isArray(item.children) && item.children.length > 0) {
        path.push(item.name)
        const rt = getActiveItem(item.children, key, path)

        if (rt) {
          return rt
        }
        path.pop()
      }
      if (item.id === key) {
        if (item.type === "dir" || item.type === "dir-link") {
          path.push(item.name)
        }
        return item
      }
    }
    return null
  }
  function getTitle (event, itemName) {
    const titles = {
      createNewDir: "create new directory",
      createNewFile: "create new File",
      removeFile: `are you sure you want to delete ${itemName} ?`,
      renameFile: `rename ${itemName}`,
    }
    return titles[event]
  }
  function getLabel (event) {
    const labels = {
      createNewDir: "new directory name",
      createNewFile: "new file name",
      renameFile: "new name",
    }
    return labels[event]
  }
  export default {
    name: "FileBrowser",
    props: { readonly: { type: Boolean, default: true } },
    data: function () {
      return {
        uploading:false,
        percentUploaded: 0,
        activeItems: [],
        openItems: [],
        items: [],
        icons: {
          file: "mdi-file-outline",
          "file-link": "mdi-file-link-outline",
          dir: "mdi-folder",
          "dir-link": "mdi-link-box-outline",
          "deadlink-link": "mdi-file-link",
          sndd: "mdi-folder-multiple-outline",
          snd: "mdi-file-multiple-outline",
        },
        openIcons: {
          dir: "mdi-folder-open",
          sndd: "mdi-folder-multiple-outline",
          snd: "mdi-file-multiple-outline",
        },
        dialog: {
          open: false,
          title: "",
          withInputField: true,
          inputFieldLabel: "",
          inputField: "",
          submitArgs: [],
        },
      }
    },
    computed: {
      ...mapState(["selectedComponent"]),
      ...mapGetters(["selectedComponentAbsPath", "pathSep"]),
    },
    watch: {
      activeItems () {
      },
      items () {
        const scriptCandidates = this.items
          .filter((e)=>{
            return e.type.startsWith("file")
          })
          .map((e)=>{
            return e.name
          })
        this.commitScriptCandidates(scriptCandidates)
      },
    },
    watch:{
      selectedComponent(){
      if (typeof this.selectedComponentAbsPath === "string") {
        SIO.emit("getFileList", this.selectedComponentAbsPath, (fileList)=>{
          this.items = fileList.map(fileListModifier.bind(null, this.pathSep))
        })
      }
      },
    },
    mounted () {
      if (typeof this.selectedComponentAbsPath === "string") {
        SIO.emit("getFileList", this.selectedComponentAbsPath, (fileList)=>{
          this.items = fileList.map(fileListModifier.bind(null, this.pathSep))
        })
      }
      if(! this.readonly){
        SIO.listenOnDrop(this.$el)
        SIO.onUploaderEvent("choose", this.showProgressBar)
        SIO.onUploaderEvent("complete", this.onUploadComplete)
        SIO.onUploaderEvent("progress", this.updateProgressBar)
      }
    },
    beforeDestroy(){
      SIO.removeUploaderEvent("choose", this.showProgressBar)
      SIO.removeUploaderEvent("complete", this.onUploadComplete)
      SIO.removeUploaderEvent("progress", this.updateProgressBar)
    },
    methods: {
      createNewJobScript (event) {
        console.log("not implemented!!")
      },
      shareFile() {
        if (!hasWebhook) {
          // store経由でwebhookのコンフィグダイアログを表示する
        }
        // 実際にwebhookを呼び出す処理
      },
      updateSelected(activeItems){
        const path = []
        const activeItem = getActiveItem(this.items, activeItems[0], path)
        if (activeItem.type.startsWith("file")) {
          this.commitSelectedFile(activeItem.id)
        }
      },
      showProgressBar(){
        console.log("upload started");
        this.uploading=true;
      },
      onUploadComplete(){
        console.log("upload done");
        this.uploading=false;
      },
      updateProgressBar(event){
        this.percentUploaded=(event.bytesLoaded / event.file.size)*100
      },
      ...mapMutations({
        commitScriptCandidates: "scriptCandidates",
        commitSelectedFile: "selectedFile",
      }),
      getChildren (item) {
        return new Promise((resolve, reject)=>{
          const path = [this.selectedComponentAbsPath]
          getActiveItem(this.items, item.id, path)
          const currentDir = path.join(this.pathSep)
          const event = (item.type === "dir" || item.type === "dir-link") ? "getFileList" : "getSNDContents"
          const args = (item.type === "dir" || item.type === "dir-link") ? [currentDir] : [currentDir, item.name, item.type.startsWith("sndd") ]
          SIO.emit(event, ...args, (fileList)=>{
            if (!Array.isArray(fileList)) {
              reject(fileList)
            }
            item.children = fileList.map(fileListModifier.bind(null, this.pathSep))
            resolve()
          })
        })
      },
      clearAndCloseDialog () {
        this.dialog.title = ""
        this.dialog.withInputField = true
        this.dialog.inputFieldLabel = ""
        this.dialog.inputField = ""
        this.dialog.activeItemPath = ""
        this.dialog.open = false
      },
      submitAndCloseDialog () {
        const path = this.dialog.activeItemPath
        if (this.dialog.submitEvent === "removeFile") {
          SIO.emit("removeFile", this.dialog.activeItem.id, (rt)=>{
            if (!rt) {
              return
            }
            removeItem(this.items, this.dialog.activeItem.id)
            this.commitSelectedFile(null);
          })
        } else if (this.dialog.submitEvent === "renameFile") {
          const newName = this.dialog.inputField
          let parentPath = path
          if (this.dialog.activeItem.type.startsWith("dir")) {
            const lastPathSep = path.lastIndexOf(this.pathSep)
            parentPath = path.slice(0, lastPathSep)
          }
          SIO.emit("renameFile", { path: parentPath, oldName: this.dialog.activeItem.name, newName }, (rt)=>{
            if (!rt) {
              return
            }
            this.dialog.activeItem.name = newName
          })
        } else if (this.dialog.submitEvent === "createNewFile" || this.dialog.submitEvent === "createNewDir") {
          const name = this.dialog.inputField
          const fullPath = `${path}${this.pathSep}${name}`
          const type = this.dialog.submitEvent === "createNewFile" ? "file" : "dir"
          SIO.emit(this.dialog.submitEvent, fullPath, (rt)=>{
            if (!rt) {
              return
            }
            const container = this.dialog.activeItem ? this.dialog.activeItem.children : this.items
            const newItem = { id: fullPath, name, path, type }
            if (this.dialog.submitEvent === "createNewDir") {
              newItem.children = []
            }
            container.push(newItem)

            if (this.dialog.activeItem && !this.openItems.includes(this.dialog.activeItem.id)) {
              this.openItems.push(this.dialog.activeItem.id)
            }
          })
        } else {
          console.log("unsupported event", this.dialog.submitEvent)
        }
        this.clearAndCloseDialog()
      },
      openDialog (event) {
        const path = [this.selectedComponentAbsPath]
        this.dialog.activeItem = getActiveItem(this.items, this.activeItems[0], path)
        this.dialog.activeItemPath = path.join(this.pathSep)

        if (event === "removeFile" || event === "renameFile") {
          if (!this.dialog.activeItem) {
            console.log("remove or rename without active item is not allowed")
            return
          }
          if (this.dialog.activeItem.type.startsWith("snd")) {
            console.log(`${event.replace("File", "")} SND or SNDD is not allowed`)
            return
          }
        }

        if (event === "removeFile") {
          this.dialog.withInputField = false
        }
        this.dialog.title = getTitle(event, this.dialog.activeItem ? this.dialog.activeItem.name : null)
        this.dialog.inputFieldLabel = getLabel(event)
        this.dialog.submitEvent = event
        this.dialog.open = true
      },
      showUploadDialog () {
        SIO.prompt();
      },
    },
  }
</script>
