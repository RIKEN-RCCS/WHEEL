<template>
  <v-app>
    <nav-drawer
      v-model="drawer"
    />
    <v-app-bar
      app
      extended
    >
      <a
        href="/home"
        class="text-uppercase text-decoration-none text-h4 white--text"
      > WHEEL </a>
      <v-spacer />
      <p class="mb-0 text-h5">
        {{ projectJson !== null ? projectJson.name : "" }}
      </p>
      <v-spacer />
      <v-btn
        rounded
        outlined
        plain
        :ripple="false"
      >
        status: {{ projectState }}
      </v-btn>
      <v-spacer />
      <v-btn
        shaped
        outlined
        plain
        :ripple="false"
      >
        last updated: {{ projectJson !== null ? projectJson.mtime : "" }}
      </v-btn>
      <v-spacer />

      <v-app-bar-nav-icon
        app
        @click="drawer = true"
      />

      <template v-slot:extension>
        <v-btn-toggle
          v-model="mode"
          mandatory
        >
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                replace
                :to="{name: 'graph' }"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-sitemap</v-icon>
              </v-btn>
            </template>
            <span>graph view</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                replace
                :to="{name: 'list' }"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-format-list-bulleted</v-icon>
              </v-btn>
            </template>
            <span>list view</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                replace
                :to="{name: 'editor' }"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-file-document-edit-outline</v-icon>
              </v-btn>
            </template>
            <span>text editor</span>
          </v-tooltip>
        </v-btn-toggle>

        <v-spacer />
        <v-card>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                icon
                :disabled="isDisabled('runProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('runProject')"
              >
                <v-icon>mdi-play</v-icon>
              </v-btn>
            </template>
            <span>run project</span>
          </v-tooltip>

          <v-tooltip
            v-if="false"
            bottom
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                icon
                :disabled="isDisabled('pauseProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('pauseProject')"
              >
                <v-icon>mdi-pause</v-icon>
              </v-btn>
            </template>
            <span>pause project</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                icon
                :disabled="isDisabled('stopProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('stopProject')"
              >
                <v-icon>mdi-stop</v-icon>
              </v-btn>
            </template>
            <span>stop project</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                icon
                :disabled="isDisabled('cleanProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('cleanProject')"
              >
                <v-icon>mdi-restore</v-icon>
              </v-btn>
            </template>
            <span>stop and cleanup project</span>
          </v-tooltip>
        </v-card>

        <v-spacer />
        <v-card>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                :disabled="isDisabled('saveProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('saveProject')"
              >
                <v-icon>mdi-content-save</v-icon>
              </v-btn>
            </template>
            <span>save project</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                outlined
                :disabled="isDisabled('revertProject')"
                v-bind="attrs"
                v-on="on"
                @click="emitProjectOperation('revertProject')"
              >
                <v-icon>mdi-folder-refresh-outline</v-icon>
              </v-btn>
            </template>
            <span>revert project</span>
          </v-tooltip>
        </v-card>
      </template>
    </v-app-bar>
    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>
    <v-footer app>
      <v-row
        justify="center"
        no-gutters
      >
        <v-btn
          @click="showLogScreen=!showLogScreen"
        >
          <v-icon v-if="showLogScreen">
            mdi-triangle-outline
          </v-icon>
          <v-icon v-if="!showLogScreen">
            mdi-triangle-outline mdi-rotate-180
          </v-icon>
        </v-btn>
        <v-col
          cols="12"
        >
          <log-screen v-show="showLogScreen" />
        </v-col>
      </v-row>
    </v-footer>
    <v-overlay :value="waiting">
      <v-progress-circular
        indeterminate
        size="64"
      />
    </v-overlay>
    <unsaved-files-dialog />
    <password-dialog
      v-model="pwDialog"
      :title="pwDialogTitle"
      @password="pwCallback"
    />
    <v-snackbar
      v-model="openSnackbar"
      :vertical="true"
      :multi-line="true"
      :timeout="-1"
      centered
      text
    >
      {{ snackbarMessage }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="indigo"
          text
          v-bind="attrs"
          @click="closeSnackbar"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
    <versatile-dialog />
  </v-app>
</template>

<script>
  "use strict";
  import { mapState, mapMutations, mapActions, mapGetters } from "vuex";
  import logScreen from "@/components/logScreen.vue";
  import NavDrawer from "@/components/common/NavigationDrawer.vue";
  import passwordDialog from "@/components/common/passwordDialog.vue";
  import unsavedFilesDialog from "@/components/unsavedFilesDialog.vue";
  import versatileDialog from "@/components/versatileDialog.vue";
  import SIO from "@/lib/socketIOWrapper.js";
  import { readCookie } from "@/lib/utility.js";
  import Debug from "debug";
  const debug = Debug("wheel:workflow:main");

  export default {
    name: "Workflow",
    components: {
      logScreen,
      NavDrawer,
      unsavedFilesDialog,
      versatileDialog,
      passwordDialog,
    },
    data: ()=>{
      return {
        projectJson: null,
        drawer: false,
        mode: 0,
        showLogScreen: false,
        pwDialog: false,
        pwDialogTitle: "",
        pwCallback: ()=>{},
      };
    },
    computed: {
      ...mapState([
        "projectState",
        "rootComponentID",
        "openSnackbar",
        "snackbarMessage",
      ]),
      ...mapGetters(["waiting"]),
    },
    mounted: function () {
      const projectRootDir = readCookie("rootDir");
      const ID = readCookie("root");
      this.commitProjectRootDir(projectRootDir);
      this.commitRootComponentID(ID);

      SIO.on("projectJson", (projectJson)=>{
        this.projectJson = projectJson;
        this.commitProjectState(projectJson.state.toLowerCase());
        this.commitComponentPath(projectJson.componentPath);
        this.commitWaitingProjectJson(false);
      });
      SIO.on("hostList", (hostList)=>{
        this.commitRemoteHost(hostList);
      });
      SIO.on("workflow", (wf)=>{
        this.commitCurrentComponent(wf);
        this.commitWaitingWorkflow(false);
      });
      SIO.on("showMessage", this.showSnackbar);
      SIO.on("askPassword", (hostname, cb)=>{
        this.pwCallback = (pw)=>{
          cb(pw);
        };
        this.pwDialogTitle = `input password or passphrase for ${hostname}`;
        this.pwDialog = true;
      });
      SIO.on("taskStateList", (task)=>{
        console.log("not implemented!");
      });
      SIO.emit("getHostList", (rt)=>{
        debug("getHostList done", rt);
      });
      SIO.emit("getComponentTree", projectRootDir, (componentTree)=>{
        this.commitComponentTree(componentTree);
      });
      this.commitWaitingProjectJson(true);
      SIO.emit("getProjectJson", (rt)=>{
        debug("getProjectJson done", rt);
      });
      this.commitWaitingWorkflow(true);
      SIO.emit("getWorkflow", ID, (rt)=>{
        debug("getWorkflow done", rt);
      });
      this.$router.replace({ name: "graph" })
        .catch((err)=>{
          if (err.name === "NavigationDuplicated") {
            return;
          }
          throw err;
        });
    },
    methods: {
      ...mapActions(["showSnackbar", "closeSnackbar"]),
      ...mapMutations(
        {
          commitComponentTree: "componentTree",
          commitProjectState: "projectState",
          commitComponentPath: "componentPath",
          commitCurrentComponent: "currentComponent",
          commitProjectRootDir: "projectRootDir",
          commitRootComponentID: "rootComponentID",
          commitRemoteHost: "remoteHost",
          commitWaitingProjectJson: "waitingProjectJson",
          commitWaitingWorkflow: "waitingWorkflow",
        },
      ),
      isDisabled (operation) {
        if (operation === "runProject") {
          return !["not-started", "paused"].includes(this.projectState);
        } else if (operation === "pauseProject") {
          return this.projectState !== "running";
        } else if (operation === "stopProject") {
          return ["not-started", "preparing"].includes(this.projectState);
        } else if (operation === "cleanProject") {
          return ["not-started", "preparing"].includes(this.projectState);
        } else if (operation === "saveProject") {
          return this.projectState !== "not-started";
        } else if (operation === "revertProject") {
          return this.projectState !== "not-started";
        }
        debug("upsupported operation", operation);
      },
      emitProjectOperation (operation) {
        SIO.emit(operation, (rt)=>{
          debug(operation, "done", rt);
        });
      },
    },
  };
</script>
