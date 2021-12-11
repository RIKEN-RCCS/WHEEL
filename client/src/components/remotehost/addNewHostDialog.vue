<template>
  <v-dialog
    v-model="openDialog"
    :max-width="maxWidth"
    :persistent="true"
  >
    <v-card>
      <v-card-title>
        add new host
      </v-card-title>
      <v-card-text>
        <v-expansion-panels
          v-model="openPanel"
          multiple
        >
          <v-expansion-panel>
            <v-expansion-panel-header>Basic settings</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-container>
                <v-row>
                  <v-col
                    cols="6"
                  >
                    <v-text-field
                      v-model="host.name"
                      label="label"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col
                    cols="6"
                  >
                    <v-text-field
                      v-model="host.host"
                      label="Hostname"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.port"
                      label="Port number"
                      :rules="[validPortNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.username"
                      label="User ID"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.path"
                      label="Host work dir"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-switch
                      v-model="usePubkey"
                      label="use public key authentication"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-if="usePubkey"
                      v-model="host.keyFile"
                      label="private key path"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="host.jobScheduler"
                      :items="availableJobSchedulers"
                      label="job scheduler"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.numJob"
                      label="max number of jobs"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.queue"
                      label="available queues"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-checkbox
                      v-model="host.useBulkjob"
                      label="use bulkjob"
                    />
                    <v-checkbox
                      v-model="host.useStepjob"
                      label="use stepjob"
                    />
                  </v-col>
                </v-row>
              </v-container>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>Advanced settings</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-container>
                <v-row>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.renewInterval"
                      label="connection renewal interval (min.)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.renewDelay"
                      label="connection renewal delay (sec.)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.statusCheckInterval"
                      label="status check interval (sec.)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.maxStatusCheckError"
                      label="max number of status check error allowed"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.execInterval"
                      label="interval time between each executions"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.readyTimeout"
                      label="timeout during handshake phase (msec.)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.keepaliveInterval"
                      label="interval time between keep alive packet  (msec.)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6" />
                </v-row>
              </v-container>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-card-actions>
        <buttons
          :buttons="buttons"
          @ok="submitHost"
          @cancel="closeDialog"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
  "use strict";
  import SIO from "@/lib/socketIOWrapper.js";
  import buttons from "@/components/common/buttons.vue";
  import { required } from "@/lib/validationRules.js";
  export default {
    Name: "PasswordDialog",
    components: {
      buttons,
    },
    props: {
      value: Boolean,
      title: { type: String, default: "input password" },
      maxWidth: { type: String, default: "50%" },
      initialValue: Object,
    },
    data: function () {
      return {
        host: {},
        usePubkey: false,
        openPanel: [0],
        availableJobSchedulers: [],
        buttons: [
          { icon: "mdi-check", label: "ok" },
          { icon: "mdi-close", label: "cancel" },
        ],
      };
    },
    computed: {
      openDialog: {
        get () {
          return this.value;
        },
        set (value) {
          this.$emit("input", value);
        },
      },
    },
    mounted () {
      SIO.emitGlobal("getJobSchedulerLabelList", (data)=>{
        this.availableJobSchedulers.splice(0, this.availableJobSchedulers.length, ...data);
      });
    },
    beforeUpdate () {
      this.host = Object.assign(this.host, this.initialValue);
    },
    methods: {
      required,
      validPortNumber (v) {
        if (typeof v !== "number") {
          return false;
        }
        return v > 0 && v < 65536;
      },
      positiveNumber (v) {
        // allow empty
        if (v === "" || typeof v === "undefined") {
          return true;
        }
        return typeof v === "number" && v >= 0;
      },
      submitHost () {
        this.$emit("newHost", this.host);
        this.closeDialog();
      },
      closeDialog () {
        this.host = {};
        this.$emit("cancel");
        this.openDialog = false;
      },
    },
  };
</script>
