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
        parameters
        <v-row
          justify="end"
        >
          <v-btn
            class="text-capitalize"
            @click="dialog=true"
          >
            <v-icon>mdi-plus</v-icon>
            add new parameter
          </v-btn>
          <v-btn
            class="text-capitalize"
            @click="$emit('openFilterEditor')"
          >
            <v-icon> mdi-pencil </v-icon>
            add filter
          </v-btn>
        </v-row>
      </v-card-title>
      <v-card-subtitle>
        <v-text-field
          v-model="placeholder"
          outlined
          readonly
        />
      </v-card-subtitle>
      <v-card-text>
        <v-data-table
          dense
          :headers="[{text: 'placeholder', value: 'placeholder', sortable: true},
                     {text: 'type', value: 'type', sortable: true},
                     { text: 'Actions', value: 'action', sortable: false }]"
          :items="params"
          hide-default-footer
        >
          <template v-slot:item.action="{ item }">
            <action-row
              :item="item"
              @edit="openDialog(item)"
              @delete="deleteItem(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
    <param-edit-dialog
      :dialog="dialog"
      :current-item="currentItem"
      @close="dialog=false"
    />
    <v-dialog
      v-model="filterDialog"
      persistent
    >
      <v-card>
        <v-card-title />
        <v-card-text>
          <v-text-field
            v-model="filterText"
            label="filter"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="updateFilter">
            <v-icon>save</v-icon>save
          </v-btn>
          <v-btn @click="closeFilterDialog">
            <v-icon>cancel</v-icon>cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
  "use strict"
  import { removeFromArray } from "@/lib/clientUtility.js"
  import paramEditDialog from "@/components/rapid/newParamDialog.vue"
  import actionRow from "@/components/common/actionRow.vue"

  export default {
    nane: "parameter",
    components: {
      paramEditDialog,
      actionRow,
    },
    props: ["placeholder", "params"],
    data () {
      return {
        currentItem: null,
        dialog: false,
        filterEdittingItem: null,
        filterText: "",
        filterDialog: false,
      }
    },
    methods: {
      openFilterDialog (item) {
        this.filterEdittingItem = item
        this.filterDialog = true
        console.log("DEBUG:", this.filterEdittingItem)
      },
      updateFilter () {
        this.$emit("updateFilter", this.filterText)
        this.closeFilterDialog()
      },
      closeFilterDialog () {
        this.filterEdittingItem = null
        this.filterDialog = false
      },
      openDialog (item) {
        this.currentItem = item
        this.dialog = true
      },
      deleteItem (item) {
        removeFromArray(this.params, item)
      },
      storeParam (target) {
        if (this.newItem.type === "min-max-step") {
          const min = Number(this.newItem.min)
          const max = Number(this.newItem.max)
          const step = Number(this.newItem.step)
          if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
            console.log("min, max or step is Nan", min, max, step)
            // TODO エラーメッセージをトーストあたりで出す
            return
          }
          target.min = min
          target.max = max
          target.step = step
        } else if (this.newItem.type === "list") {
          target.list = this.newItem.list.map((e)=>{ return e.item })
        } else if (this.newItem.type === "files") {
          target.files = this.newItem.files.map((e)=>{ return e.item })
        }
      },
      addItem () {
        const newParam = { keyword: this.placeholder }
        this.params.push(newParam)
        this.storeParam(newParam)
        this.$emit("newParamAdded")
      },
      updateItem (item) {
        const targetIndex = this.params.findIndex((e)=>{
          return e === item
        })
        if (targetIndex === -1) {
          return
        }
        this.storeParam(this.params[targetIndex])
      },
      commitChange () {
        if (this.currentItem === null) {
          this.addItem()
        } else {
          this.updateItem(this.currentItem)
        }
        // clear all input value except for type prop
        const tmp = this.newItem.type
        this.closeAndResetDialog()
        this.newItem.type = tmp
      },
      closeAndResetDialog () {
        this.dialog = false
        this.currentItem = null
      },
    },
  }
</script>
