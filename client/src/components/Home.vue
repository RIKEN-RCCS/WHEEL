<template>
  <v-app>
    <nav-drawer
      v-model="drawer"
    />
    <v-app-bar app>
      <a
        href="/home"
        class="text-uppercase text-decoration-none text-h4 white--text"
      > WHEEL </a>
      <span
        class="text-lowercase text-decoration-none text-h5 white--text ml-4"
      >
        home
      </span>
      <v-spacer />
      <v-app-bar-nav-icon
        app
        @click="drawer = true"
      />
    </v-app-bar>
    <v-main>
      <v-toolbar extended>
        <v-btn
          :disabled="batchMode"
          @click="openProject"
        >
          <v-icon>mdi-pencil</v-icon>
          open
        </v-btn>
        <v-btn
          :disabled="batchMode"

          @click="dialogMode='newProject';dialogTitle = 'create new project'; dialog=true"
        >
          <v-icon>mdi-plus</v-icon>
          new
        </v-btn>
        <v-btn
          @click="openDeleteProjectDialog(true)"
        >
          <v-icon>mdi-text-box-remove-outline</v-icon>
          remove from list
        </v-btn>
        <v-btn
          @click="openDeleteProjectDialog(false)"
        >
          <v-icon>mdi-trash-can-outline</v-icon>
          remove
        </v-btn>
        <v-switch
          v-model="batchMode"
          label="batch mode"
        />
      </v-toolbar>
      <v-data-table
        v-model="selectedInTable"
        show-select
        :single-select="!batchMode"
        :headers="headers"
        :items="projectList"
      >
        <template #item.name="props">
          <v-edit-dialog
            class="trancated-row"
            :return-value.sync="props.item.name"
            @save="renameProject(props.item)"
          >
            {{ props.item.name }}
            <template #input>
              <v-text-field
                v-model="props.item.name"
                label="rename"
                single-line
                counter
              />
            </template>
          </v-edit-dialog>
        </template>
        <template #item.description="props">
          <span
            class="d-inline-block text-truncate trancated-row"
          >{{ props.item.description }} </span>
        </template>
        <template #item.path="props">
          <span
            class="d-inline-block text-truncate trancated-row"
          >{{ props.item.path }} </span>
        </template>
      </v-data-table>
      <v-dialog
        v-model="dialog"
        max-width="70%"
        scrollable
      >
        <v-card>
          <v-card-title> {{ dialogTitle }}</v-card-title>
          <v-card-actions>
            <v-spacer />
            <buttons
              :buttons="buttons"
              @open="openProject"
              @create="createProject"
              @cancel="closeDialog"
            />
          </v-card-actions>
          <v-card-actions v-if="dialogMode === 'newProject'">
            <v-text-field
              v-model="newProjectName"
              label="project name"
              outlined
              :rules="[required]"
            />
            <v-textarea
              v-model="newProjectDescription"
              label="project description"
              rows="2"
              auto-grow
              outlined
            />
          </v-card-actions>
          <v-card-text>
            <file-browser
              @update="(a)=>{selectedInTree=a}"
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-main>
    <remove-confirm-dialog
      v-model="rmDialog"
      title="remove project"
      :message="removeProjectMessage"
      :remove-candidates="removeCandidates"
      @remove="commitRemoveProjects"
    />
  </v-app>
</template>
<script>
  "use strict";
  import navDrawer from "@/components/common/NavigationDrawer.vue";
  import fileBrowser from "@/components/common/fileBrowserLite.vue";
  import removeConfirmDialog from "@/components/common/removeConfirmDialog.vue";
  import buttons from "@/components/common/buttons.vue";
  import { readCookie } from "@/lib/utility.js";
  import SIO from "@/lib/socketIOWrapper.js";
  import { required } from "@/lib/validationRules.js";

  // it should be get from server
  const projectJsonFilename = "prj.wheel.json";
  const reProjectJsonFilename = new RegExp(`/${projectJsonFilename}$`);

  export default {
    name: "Home",
    components: {
      navDrawer,
      fileBrowser,
      buttons,
      removeConfirmDialog,
    },
    data: ()=>{
      return {
        batchMode: false,
        drawer: false,
        dialog: false,
        rmDialog: false,
        removeFromList: false,
        dialogMode: "default",
        selectedInTree: null,
        selectedInTable: [],
        projectList: [],
        headers: [
          { text: "Project Name", value: "name", width: "20vw" },
          { text: "Description", value: "description", width: "20vw" },
          { text: "Path", value: "path", width: "20vw" },
          { text: "Create time", value: "ctime" },
          { text: "Last modified time", value: "mtime" },
          { text: "State", value: "state" },
        ],
        dialogTitle: "",
        newProjectName: "",
        newProjectDescription: "",
        removeCandidates: [],
        pathSep: "/",
        home: "/",
      };
    },
    computed: {
      selected () {
        let rt = this.selectedInTable.length > 0 ? this.selectedInTable[0].path : this.home;

        if (this.selectedInTree) {
          rt = this.selectedInTree.replace(reProjectJsonFilename, "");
        }
        return rt;
      },
      buttons () {
        const open = { icon: "mdi-check", label: "open" };
        const create = { icon: "mdi-plus", label: "create" };
        const cancel = { icon: "mdi-close", label: "cancel" };
        const rt = [cancel];
        switch (this.dialogMode) {
          case "newProject":
            rt.unshift(create);
            break;
          default:
            rt.unshift(open);
            break;
        }
        return rt;
      },
      removeProjectMessage () {
        return this.removeFromList ? "remove projects from list" : "remove project files";
      },
    },
    mounted: function () {
      this.pathSep = readCookie("pathSep");
      this.home = readCookie("home");
      SIO.emitHome("getProjectList", true);
      SIO.onHome("projectList", (data)=>{
        this.projectList.splice(0, this.projectList.length, ...data);
      });
    },
    methods: {
      required,
      closeDialog () {
        this.dialog = false;
        this.dialogMode = "default";
        this.selectedInTree = null;
        this.newProjectName = "";
        this.newProjectDescription = "";
        this.dialogTitle = "";
      },
      createProject () {
        if (!this.newProjectName) {

        }
        const path = `${this.selected}/${this.newProjectName}`;
        SIO.emitHome("addProject", path, this.newProjectDescription);
        this.closeDialog();
      },
      openProject () {
        if (this.selected === this.home) {
          this.dialogTitle = "select project path";
          this.dialogMode = "default";
          this.dialog = true;
          return;
        }
        const form = document.createElement("form");
        form.setAttribute("action", "/workflow");
        form.setAttribute("method", "post");
        form.style.display = "none";
        document.body.appendChild(form);
        const input = document.createElement("input");
        input.setAttribute("type", "hidden");
        input.setAttribute("name", "project");
        input.setAttribute("value", this.selected);
        form.appendChild(input);
        form.submit();
      },
      renameProject (item) {
        SIO.emitHome("renameProject", { id: item.id, newName: item.name, path: item.path });
      },
      openDeleteProjectDialog (fromListOnly) {
        this.removeFromList = fromListOnly;
        this.removeCandidates = this.selectedInTable.map((e)=>{ return e.name; });
        this.rmDialog = true;
      },
      commitRemoveProjects () {
        const removeIDs = this.selectedInTable
          .map((e)=>{
            return e.id;
          });
        const eventName = this.removeFromList ? "removeProjectsFromList" : "removeProjects";
        SIO.emitGlobal(eventName, removeIDs, (rt)=>{
          if (!rt) {
            console.log("remove failed", rt);
            SIO.emitGlobal("getProjectList", (data)=>{
              if (!Array.isArray(data)) {
                console.log("illegal projectlist recieved", data);
                return;
              }
              this.projectList.splice(0, this.projectList.length, ...data);
            });
            return;
          }
          const newProjectList = this.projectList.filter((e)=>{
            return !removeIDs.includes(e.id);
          });
          this.projectList.splice(0, this.projectList.length, ...newProjectList);
          this.selectedInTable = [];
        });
      },
    },
  };
</script>
<style>
.trancated-row{
  max-width: 20vw;
}
</style>
