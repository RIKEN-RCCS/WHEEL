<template>
  <v-data-table
    :items="items"
    :headers="headersWithActions"
    disable-filterling
    disable-pagination
    hide-default-header
    hide-default-footer
  >
    <template v-slot:header>
      {{ label }}
    </template>
    <template v-slot:item.name="props">
      <v-edit-dialog
        large
        persistent
        @open="edittingField=props.item.name;editTarget=props.item.name"
        @save="onSaveEditDialog(props.item, props)"
      >
        {{ props.item.name }}
        <template v-slot:input>
          <v-text-field
            v-model="edittingField"
            :rules="[editingItemIsNotDuplicate]"
            clearable
          />
        </template>
      </v-edit-dialog>
    </template>
    <template v-slot:item.actions="{ item }">
      <action-row
        :can-edit="false"
        :item="item"
        @delete="deleteItem"
      />
    </template>
    <template
      v-if="inputColumn"
      v-slot:footer
    >
      <v-text-field
        v-model.lazy="inputField"
        :rules="[newItemIsNotDuplicate]"
        :disabled="disabled"
        outlined
        dense
        clearable
        append-outer-icon="mdi-plus"
        @click:append-outer="addItem"
        @change="addItem"
      />
    </template>
  </v-data-table>
</template>
<script>
  import { removeFromArray } from "@/lib/clientUtility.js"
  import actionRow from "@/components/common/actionRow.vue"

  export default {
    name: "ListForm",
    components: {
      actionRow,
    },
    props: {
      label: String,
      items: { type: Array, required: true },
      headers: {
        type: Array,
        default: function () {
          return [{ value: "name", sortable: false }]
        },
      },
      newItemTemplate: {
        type: Object,
        default: function () {
          return { name: "" }
        },
      },
      disabled: Boolean,
      inputColumn: { type: Boolean, default: true },
    },
    data: function () {
      return {
        inputField: null,
        edittingField: null,
        editTarget: null,
      }
    },
    computed: {
      headersWithActions: function () {
        const rt = this.headers.filter((e)=>{
          return e.value !== "actions"
        })
        rt.push({ value: "actions", text: "", sortable: false })
        rt[0].editable = true
        return rt
      },
      editableRows: function () {
        return this.headersWithActions
          .filter((e)=>{
            return e.editable
          })
          .map((e)=>{
            return e.value
          })
      },
    },
    methods: {
      isDuplicate (newItem) {
        if (typeof newItem !== "string") {
          return false
        }
        return this.items.some((e)=>{
          return e.name === newItem
        })
      },
      newItemIsNotDuplicate: function (newItem) {
        return this.isDuplicate(newItem) ? "duplicated name is not allowed" : true
      },
      editingItemIsNotDuplicate: function (newItem) {
        return this.isDuplicate(newItem) && this.editTarget !== newItem ? "duplicated name is not allowed" : true
      },
      // 2nd argument also have item ,isMobile, header, and value prop. and value is old value
      onSaveEditDialog: function (item, { index }) {
        if (this.isDuplicate(this.edittingField) && this.editTarget !== this.edittingField) {
          return
        }
        item.name = this.edittingField
        this.$emit("update", item, index)
      },
      addItem: function () {
        if (this.isDuplicate(this.inputField)) {
          return
        }
        const newItem = Object.assign({}, this.newItemTemplate || {})
        newItem.name = this.inputField
        this.items.push(newItem)
        this.$emit("add", newItem)
        this.inputField = null
      },
      deleteItem: function (v) {
        const index = removeFromArray(this.items, v, "name")

        if (index !== -1) {
          this.$emit("remove", v, index)
        }
      },
    },

  }
</script>
