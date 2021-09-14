<template>
  <v-dialog
    v-if="openDialog"
    v-model="openDialog"
    persistent
    width="auto"
  >
    <v-card>
      <v-card-title>
        {{ dialogContent.title }}
      </v-card-title>
      <v-card-text>
        {{ dialogContent.message }}
        <v-text-field
          v-if="dialogContent.withInputField"
          v-model="dialogContent.inputField"
          :label="dialogContent.inputFieldLabel"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <div
          v-for="(item, index) in dialogContent.buttons"
          :key="index"
        >
          <v-btn
            @click="btnCallback(item.cb)"
          >
            <v-icon>
              {{ item.icon }}
            </v-icon>
            {{ item.label }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
  import { mapState, mapActions } from "vuex";
  export default {
    name: "VersatileDialog",
    computed: {
      ...mapState(["openDialog", "dialogContent"]),
    },
    methods: {
      ...mapActions(["closeDialog"]),
      btnCallback (cb) {
        if (typeof cb === "function") {
          cb();
        }
        this.closeDialog();
      },
    },

  };
</script>
