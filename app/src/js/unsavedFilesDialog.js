"use strict";

Vue.component("unsaved-files-dialog", {
  template: `
    <v-dialog v-model="unsavedFilesDialog" persistent>
      <v-card>
        <v-card-title class="headline">unsaved files</v-card-title>
        <v-card-text>
          <v-data-table
             :headers="headers" 
             :items="unsavedFiles"
             disable-pagination
             hide-default-footer
             dense
          ></v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-btn class="text-capitalize" @click="saveAll"><v-icon>mdi-content-save-all-outline</v-icon>Save All</v-btn>
          <v-btn class="text-capitalize" @click="discardChanges"><v-icon>mdi-alert-circle-outline</v-icon>discard all changes</v-btn>
          <v-btn class="text-capitalize" @click="closeDialog"><v-icon>mdi-close</v-icon>cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    `,
  data() {
    return {
      headers: [{ text: "status", value: "status" }, { text: "filename", value: "name" }]
    };
  },
  props: ["unsavedFiles", "cb", "dialog"],
  computed: {
    unsavedFilesDialog() {
      return this.dialog === "unsavedFiles";
    }
  },
  updated() {
    console.log("DEBUG: onUpdated", this.unsavedFiles);
  },
  methods: {
    closeDialog() {
      this.unsavedFiles.splice(0);
      this.$emit("close-dialog");
    },
    discardChanges() {
      this.cb(false);
      this.closeDialog();
    },
    saveAll() {
      this.cb(true);
      this.closeDialog();
    }
  }
});
