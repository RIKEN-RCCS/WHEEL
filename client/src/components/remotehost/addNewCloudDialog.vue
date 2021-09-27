<template>
  <v-dialog
    v-model="openDialog"
    :max-width="maxWidth"
  >
    <v-card>
      <v-card-title>
        cloud service setting
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
                      v-model="host.type"
                      label="cloud service provider"
                      readonly
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.os"
                      label="OS"
                      readonly
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.region"
                      label="region"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.numNodes"
                      label="number of instance"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.InstanceType"
                      label="instance type"
                      :rules="[required]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="host.rootVolume"
                      label="root storage volume (GB)"
                      :rules="[positiveNumber]"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.mpi"
                      label="MPI library"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="host.compiler"
                      label="compiler"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-textarea
                      v-model="host.playbook"
                      label="playbook for setup"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-textarea
                      v-model="host.additionalParams"
                      label="additional parameters"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-textarea
                      v-model="host.additionalParamsForHead"
                      label="additional parameters for head node"
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
        host: { type: "aws", os: "ubuntu16" },
        usePubkey: false,
        openPanel: [0],
        availableJobSchedulers: ["ParallelNavi", "PBSPro", "SLURM"],
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
        this.openDialog = false;
      },
    },
  };
</script>
