<template>
  <div>
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
          <v-form
            ref="form"
          >
            <v-expansion-panels
              v-model="openPanel"
              multiple
            >
              <v-expansion-panel>
                <v-expansion-panel-header>Basic settings</v-expansion-panel-header>
                <v-expansion-panel-content>
                  <v-container>
                    <v-row>
                      <v-col cols="6">
                        <v-text-field
                          v-model="host.name"
                          label="label"
                          :rules="[required, notDupulicatedLabel]"
                          placeholder="required"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="host.host"
                          label="Hostname"
                          :rules="[required]"
                          placeholder="required"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.port"
                          label="Port number"
                          :rules="[validPortNumber]"
                          placeholder="required"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="host.username"
                          label="User ID"
                          :rules="[required]"
                          placeholder="required"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="host.path"
                          label="Host work dir"
                          :rules="[required]"
                          placeholder="required"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-switch
                          v-model="usePubkey"
                          label="use public key authentication"
                        />
                      </v-col>
                      <v-col cols="4">
                        <v-text-field
                          v-if="usePubkey"
                          v-model="host.keyFile"
                          label="private key path"
                        />
                      </v-col>
                      <v-col cols="2">
                        <v-btn
                          v-if="usePubkey"
                          @click="openFileBrowser=!openFileBrowser"
                        >
                          browse
                        </v-btn>
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
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.renewDelay"
                          label="connection renewal delay (sec.)"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.statusCheckInterval"
                          label="status check interval (sec.)"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.maxStatusCheckError"
                          label="max number of status check error allowed"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.execInterval"
                          label="interval time between each executions"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.readyTimeout"
                          label="timeout during handshake phase (msec.)"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="host.keepaliveInterval"
                          label="interval time between keep alive packet  (msec.)"
                          :rules="[positiveNumber]"
                          validate-on-blur
                        />
                      </v-col>
                      <v-col cols="6" />
                    </v-row>
                  </v-container>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            :disabled="hasError"
            @click="submitHost"
          >
            <v-icon>
              mdi-check
            </v-icon>
            OK
          </v-btn>
          <v-btn @click="cancelDialog">
            <v-icon>
              mdi-close
            </v-icon>
            cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="openFileBrowser"
      max-width="70%"
      :persistent="true"
      overlay-opacity="100"
      scrollable
    >
      <v-card>
        <v-card-title>select private key file</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            :disabled="!selectedFile"
            @click="host.keyFile=selectedFile;closeFileBrowser()"
          >
            <v-icon>
              mdi-check
            </v-icon>
            OK
          </v-btn>
          <v-btn @click="closeFileBrowser">
            <v-icon>
              mdi-close
            </v-icon>
            cancel
          </v-btn>
        </v-card-actions>
        <v-card-text>
          <file-browser
            mode="all"
            @update="(a)=>{selectedFile=a}"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
  "use strict";
  import SIO from "@/lib/socketIOWrapper.js";
  import fileBrowser from "@/components/common/fileBrowserLite.vue";
  import { required, validPortNumber, positiveNumber } from "@/lib/validationRules.js";
  export default {
    Name: "newHostDialog",
    components:{
      fileBrowser
    },
    props: {
      value: Boolean,
      title: { type: String, default: "remote host" },
      maxWidth: { type: String, default: "50%" },
      hostNames: {type: Array, default: ()=>{return [];}},
      initialValue: {type: Object, default: ()=>{return {};}},
      availableJobSchedulers: {type: Array, default: ()=>{return [];}},
    },
    data: function () {
      return {
        host: {
          port: 22
        },
        usePubkey: false,
        openPanel: [0],
        pathSep: "/",
        home: "/",
        openFileBrowser: false,
        selectedFile:null
      };
    },
    computed: {
      hasError (){
        return this.hostNames.includes(this.host.name)
          || this.required(this.host.name) !== true
          || this.required(this.host.host) !== true
          || this.required(this.host.port) !== true
          || this.required(this.host.username) !== true
          || this.required(this.host.path) !== true;
      },
      openDialog: {
        get () {
          return this.value;
        },
        set (value) {
          this.$emit("input", value);
        },
      },
    },
    watch:{
      openDialog(v){
      this.host = Object.assign(this.host, this.initialValue);
      }
    },
    methods: {
      closeFileBrowser(){
        this.selectedFile=null;
        this.openFileBrowser=false;
      },
      notDupulicatedLabel (v){
        return !this.hostNames.includes(v) ||"label is already in use";
      },
      required,
      validPortNumber,
      positiveNumber: positiveNumber.bind(null, true),
      submitHost () {
        this.$emit("newHost", this.host);
        this.closeDialog();
      },
      cancelDialog(){
        this.$emit("cancel");
        this.closeDialog();
      },
      closeDialog () {
        this.host = {};
        this.$refs.form.reset();
        this.openDialog = false;
      },
    },
  };
</script>
