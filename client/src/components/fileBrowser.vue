<template>
  <div>
    <div v-if="! readonly">
      <v-spacer />
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="openDialog('createNewDir')"
          >
            mdi-folder-plus-outline
          </v-icon>
        </template>
        new folder
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="openDialog('createNewFile')"
          >
            mdi-file-plus-outline
          </v-icon>
        </template>
        new file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="createNewJobScript('newJobscript')"
          >
            mdi-file-document-edit-outline
          </v-icon>
        </template>
        create job script file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="openDialog('renameFile')"
          >
            mdi-file-move-outline
          </v-icon>
        </template>
        rename
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="openDialog('removeFile')"
          >
            mdi-file-remove-outline
          </v-icon>
        </template>
        delete
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="showUploadDialog"
          >
            mdi-upload
          </v-icon>
        </template>
        upload file
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on, attrs }">
          <v-icon
            v-bind="attrs"
            v-on="on"
            @click="callWebhook"
          >
            mdi-share-outline
          </v-icon>
        </template>
        call web hook
      </v-tooltip>
    </div>
    <v-treeview
      :active.sync="activeItems"
      :items="items"
      :load-children="getChildren"
      activatable
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
<script>
  import { mapState, mapGetters } from "vuex"
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
        if (item.type === "snd") {
          path.pop()
        } else if (item.type === "dir" || item.type === "dir-link") {
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
        activeItems: [],
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
      ...mapState(["selectedComponent", "pathSep"]),
      ...mapGetters(["selectedComponentAbsPath"]),
    },
    mounted () {
      if (typeof this.selectedComponentAbsPath !== "string") {
        return
      }
      SIO.emit("getFileList", this.selectedComponentAbsPath, (fileList)=>{
        this.items = fileList.map(fileListModifier.bind(null, this.pathSep))
      })
    },
    methods: {
      getChildren (item) {
        return new Promise((resolve, reject)=>{
          const path = [this.selectedComponentAbsPath]
          getActiveItem(this.items, item.id, path)
          const currentDir = path.join(this.pathSep)
          const event = (item.type === "dir" || item.type === "dir-link") ? "getFileList" : "getSNDContents"
          const args = (item.type === "dir" || item.type === "dir-link") ? [currentDir] : [
            item.name, item.type.startsWith("sndd"),
          ]
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
          })
        } else if (this.dialog.submitEvent === "renameFile") {
          const newName = this.dialog.inputField
          SIO.emit("renameFile", { path, oldName: this.dialog.activeItem.name, newName }, (rt)=>{
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
            this.dialog.activeItem.children.push({
              id: fullPath,
              name,
              path,
              type,
            })
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
        }

        if (event === "removeFile") {
          this.dialog.withInputField = false
        }
        this.dialog.title = getTitle(event, this.dialog.activeItem ? this.dialog.activeItem.name : null)
        this.dialog.inputFieldLabel = getLabel(event)
        this.dialog.submitEvent = event
        this.dialog.open = true
      },
      createNewJobScript (event) {
        console.log("not implemented!!")
      },
      callWebhook () {
        if (!hasWebhook) {
          // store経由でwebhookのコンフィグダイアログを表示する
        }
        // 実際にwebhookを呼び出す処理
      },
      showUploadDialog () {
      },
    },
  }
</script>
