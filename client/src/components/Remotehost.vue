<template>
  <v-app>
    <nav-drawer
      v-model="drawer"
    />
    <v-app-bar
      app
      extended
    >
      <v-app-bar-title>
        <a
          href="/home"
          class="text-uppercase text-decoration-none text-h4 white--text"
        > WHEEL </a>
        <span calss=" text-h5">
          remotehost
        </span>
      </v-app-bar-title>
      <v-spacer />
      <v-app-bar-nav-icon
        app
        @click="drawer = true"
      />
    </v-app-bar>
    <v-main>
      <v-toolbar>
        <v-btn @click="newHostDialog=true">
          new remote host setting
        </v-btn>
        <v-btn @click="newCloudDialog=true">
          new cloud setting
        </v-btn>
      </v-toolbar>
      <v-data-table
        :items="hosts"
        :headers="headers"
      >
        <template v-slot:item.connectionTest="{ item }">
          <v-btn
            :color="item.testResult"
            :loading="item.loading"
            @click="openPasswordDialog(item)"
          >
            <v-icon> {{ item.icon }} </v-icon>
            {{ item.connectionStatus }}
          </v-btn>
        </template>
        <template v-slot:item.action="{ item }">
          <action-row
            :item="item"
            @delete="openRemoveConfirmDialog(item)"
            @edit="openEditDialog(item)"
          />
        </template>
      </v-data-table>
      <password-dialog
        v-model="pwDialog"
        @password="testConnection"
      />
      <remove-confirm-dialog
        v-model="rmDialog"
        :title="removeConfirmMessage"
        @remove="removeRemotehost"
      />
      <add-new-host-dialog
        v-model="newHostDialog"
        max-width="80vw"
        :initial-value="currentSetting"
        @newHost="addNewSetting"
      />
      <add-new-cloud-dialog
        v-model="newCloudDialog"
        max-width="80vw"
        :initial-value="currentSetting"
        @newHost="addNewSetting"
      />
    </v-main>
  </v-app>
</template>
<script>
  "use strict";
  import SIO from "@/lib/socketIOWrapper.js";
  import actionRow from "@/components/common/actionRow.vue";
  import navDrawer from "@/components/common/NavigationDrawer.vue";
  import removeConfirmDialog from "@/components/common/removeConfirmDialog.vue";
  import passwordDialog from "@/components/common/passwordDialog.vue";
  import addNewHostDialog from "@/components/remotehost/addNewHostDialog.vue";
  import addNewCloudDialog from "@/components/remotehost/addNewCloudDialog.vue";

  export default {
    name: "Remotehost",
    components: {
      navDrawer,
      actionRow,
      passwordDialog,
      removeConfirmDialog,
      addNewHostDialog,
      addNewCloudDialog,
    },
    data: ()=>{
      return {
        drawer: false,
        pwDialog: false,
        rmDialog: false,
        newHostDialog: false,
        newCloudDialog: false,
        headers: [
          { text: "name", value: "name" },
          { text: "connection test", value: "connectionTest" },
          { text: "hostname", value: "host" },
          { text: "usrename", value: "username" },
          { text: "port", value: "port" },
          { text: "private key", value: "keyFile" },
          { text: "delete", value: "action", sortable: false },
        ],
        hosts: [],
        testTargetID: null,
        removeConfirmMessage: "",
        currentSetting: {},
      };
    },
    mounted () {
      SIO.emitGlobal("getHostList", (data)=>{
        data.forEach((e)=>{
          e.icon = "mdi-lan-pending";
          e.connectionStatus = "test";
        });
        this.hosts.splice(0, this.hosts.length, ...data);
      });
    },
    methods: {
      openEditDialog (item) {
        console.log("DEBUG: edit", item);
        this.currentSetting = item;

        if (item.type === "aws") {
          this.newCloudDialog = true;
          return;
        }
        this.newHostDialog = true;
      },
      addNewSetting (updated) {
        if (updated.id) {
          // update
          delete (updated.icon);
          delete (updated.connectionStatus);
          delete (updated.testResult);
          delete (updated.loading);
          SIO.emitGlobal("updateHost", updated, (rt)=>{
            if (!rt) {
              console.log("updateHost API failed", rt);
              return;
            }
            // initialize conection status
            updated.loading = false;
            delete (updated.testResult);
            updated.icon = "mdi-lan-pending";
            updated.connectionStatus = "test";
            const index = this.hosts.findIndex((e)=>{
              return updated.id === e.id;
            });
            if (index >= 0) {
              this.hosts.splice(index, 1, updated);
            }
          });
          return;
        }
        SIO.emitGlobal("addHost", updated, (id)=>{
          if (!id) {
            console.log("addHost API failed", id);
            return;
          }
          updated.id = id;
          // these props never sent to server
          updated.icon = "mdi-lan-pending";
          updated.connectionStatus = "test";
          this.hosts.unshift(updated);
        });
      },
      openRemoveConfirmDialog (item) {
        this.rmTarget = item;
        this.removeConfirmMessage = `Are you shure you want to remove ${item.name} ?`;
        this.rmDialog = true;
      },
      removeRemotehost () {
        SIO.emitGlobal("removeHost", this.rmTarget.id, (rt)=>{
          if (!rt) {
            console.log("removeHost API failed", this.rmTarget.id);
            return;
          }
          const index = this.hosts.findIndex((e)=>{
            return e.id === this.rmTarget.id;
          });

          if (index >= 0) {
            this.hosts.splice(index, 1);
          }
        });
      },
      openPasswordDialog (item) {
        this.testTargetID = item.id;
        this.pwDialog = true;
      },
      testConnection (pw) {
        const item = this.hosts.find((e)=>{
          return e.id === this.testTargetID;
        });
        item.loading = true;
        SIO.emitGlobal("tryToConnect", item, pw, (rt)=>{
          item.loading = false;
          item.testResult = rt;
          item.connectionStatus = rt === "success" ? "OK" : "failed";
          item.icon = rt === "success" ? "mdi-lan-connect" : "mdi-lan-disconnect";
          this.$forceUpdate();
        });
        this.testTargetID = null;
      },
    },
  };
</script>
