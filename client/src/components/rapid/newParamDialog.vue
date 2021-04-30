<template>
  <v-dialog
    v-model="dialog"
    persistent
  >
    <v-card>
      <v-card-title>
        <span class="headline"> parameter setting </span>
      </v-card-title>
      <v-card-text>
        <v-select
          v-model="newItem.type"
          outlined
          :items="['min-max-step', 'list', 'files']"
        />
        <v-row v-if="newItem.type==='min-max-step'">
          <v-text-field
            v-model="newItem.min"
            type="number"
            hint="min"
            persistent-hint
            :rules="[required]"
            novalidate
          />
          <v-text-field
            v-model="newItem.max"
            type="number"
            hint="max"
            persistent-hint
            :rules="[required]"
            novalidate
          />
          <v-text-field
            v-model="newItem.step"
            type="number"
            hint="step"
            persistent-hint
            :rules="[required]"
            novalidate
          />
        </v-row>
        <div v-if="newItem.type==='list'">
          <list-form
            :items="newItem.list"
            :headers="listHeaders"
          />
        </div>
        <div v-if="newItem.type==='files'">
          <list-form
            :items="newItem.files"
            :headers="filesHeaders"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="commitChange">
          <v-icon>mdi-content-save</v-icon>save
        </v-btn>
        <v-btn @click="closeAndResetDialog">
          <v-icon>mdi-cancel</v-icon>cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
  "use strict"
  import listForm from "@/components/common/listForm.vue"
  import Debug from "debug"
  const debug = Debug("wheel:new-param-dialog")

  export default {
    name: "ParamEditDialog",
    components: {
      listForm,
    },
    props: {
      dialog: Boolean,
      currentItem: Object,
    },
    data: function () {
      return {
        newItem: {
          type: "min-max-step",
          list: [],
          files: [],
          min: 0,
          max: 0,
          step: 1,
        },
        listHeaders: [
          { text: "value", value: "item", sortable: true },
        ],
        fileHeaders: [
          { text: "filename", value: "item", sortable: true },
        ],
      }
    },
    mounted: function () {
      this.reset()

      if (this.currentItem === null || typeof this.currentItem === "undefined") {
        debug("add new parameter")
        return
      }
      debug("edit this parameter", this.currentItem)
      this.newItem.type = this.currentItem.type

      if (this.currentItem.type === "min-max-step") {
        this.newItem.min = this.currentItem.min
        this.newItem.max = this.currentItem.max
        this.newItem.step = this.currentItem.step
      } else if (this.curentItem.type === "list") {
        // TODO 長さが変わるケースで問題無いか確認する
        this.newItem.list = this.currentItem.list
      } else if (this.currentItem.type === "files") {
        this.newItem.files = this.currentItem.files
      }
    },
    methods: {
      reset () {
        this.newItem = {
          type: this.newItem ? this.newItem.type : "min-max-step",
          list: [],
          files: [],
          min: 0,
          max: 0,
          step: 1,
        }
      },
      required (v) {
        return v !== "" || "must be number."
      },
      commitChange () {
        this.$emit("", this.newItem)
        this.closeAndResetDialog()
      },
      closeAndResetDialog () {
        this.reset()
        this.$emit("close")
      },
    },
  }
</script>
