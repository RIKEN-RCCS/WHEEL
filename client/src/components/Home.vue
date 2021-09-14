<template>
  <v-app>
    <nav-drawer
      v-model="drawer"
    />
    <v-app-bar app>
      <v-app-bar-title>
        <a
          href="/home"
          class="text-uppercase text-decoration-none text-h4 white--text"
        > WHEEL </a>
        <span class="text-decoration-none text-h5">
          home
        </span>
      </v-app-bar-title>
      <v-spacer />
      <v-app-bar-nav-icon
        app
        @click="drawer = true"
      />
    </v-app-bar>
    <v-main>
      <v-toolbar extended>
        <v-btn @click="openProject">
          <v-icon>mdi-pencil</v-icon>
          open
        </v-btn>
        <v-btn @click="dialogMode='newProject'; dialog=true">
          <v-icon>mdi-plus</v-icon>
          new
        </v-btn>
      </v-toolbar>
      <v-data-table
        v-model="selectedInTable"
        show-select
        single-select
        :headers="headers"
        :items="projectList"
      >
        <template v-slot:item.name="props">
          <v-edit-dialog
            class="trancated-row"
            :return-value.sync="props.item.name"
            @save="renameProject(props.item)"
          >
            {{ props.item.name }}
            <template v-slot:input>
              <v-text-field
                v-model="props.item.name"
                label="rename"
                single-line
                counter
              />
            </template>
          </v-edit-dialog>
        </template>
        <template v-slot:item.description="props">
          <span
            class="d-inline-block text-truncate trancated-row"
          >{{ props.item.description }} </span>
        </template>
        <template v-slot:item.path="props">
          <span
            class="d-inline-block text-truncate trancated-row"
          >{{ props.item.path }} </span>
        </template>
        <template v-slot:item.action="{ item }">
          <action-row
            :item="item"
            :can-edit="false"
            @delete="deleteProjectDialog(item)"
          />
        </template>
      </v-data-table>
      <v-dialog
        v-model="dialog"
        max-width="50%"
      >
        <v-card>
          <v-card-title> {{ dialogTitle }}</v-card-title>
          <v-card-actions v-if="dialogMode === 'newProject'">
            <v-text-field
              v-model="newProjectName"
              label="project name"
              outlined
            />
            <v-textarea
              v-model="newProjectDescription"
              label="project description"
              outlined
            />
          </v-card-actions>
          <v-card-actions>
            <v-spacer />
            <buttons
              :buttons="buttons"
              @open="openProject"
              @create="createProject"
              @remove="removeProject"
              @cancel="closeDialog"
            />
          </v-card-actions>
          <v-card-text>
            <file-browser
              v-if="dialogMode !== 'removeProject'"
              :path-sep="pathSep"
              :root="home"
              @update="(a)=>{selectedInTree=a}"
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>
<script>
  "use strict";
  import navDrawer from "@/components/common/NavigationDrawer.vue";
  import actionRow from "@/components/common/actionRow.vue";
  import fileBrowser from "@/components/common/fileBrowserLite.vue";
  import buttons from "@/components/common/buttons.vue";
  import { readCookie } from "@/lib/utility.js";
  import SIO from "@/lib/socketIOWrapper.js";

  // it should be get from server
  const projectJsonFilename = "prj.wheel.json";
  const reProjectJsonFilename = new RegExp(`/${projectJsonFilename}$`);

  export default {
    name: "Home",
    components: {
      navDrawer,
      actionRow,
      fileBrowser,
      buttons,
    },
    data: ()=>{
      return {
        drawer: false,
        dialog: false,
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
          { text: "delete", value: "action", sortable: false },
        ],
        dialogTitle: "",
        newProjectName: "",
        newProjectDescription: "",
        removeCandidate: null,
        pathSep: "/",
        home: "/",
      };
    },
    computed: {
      selected () {
        let rt = this.selectedInTable.length > 0 ? this.selectedInTable[0].path : this.home;
        console.log(this.selectedInTable);

        if (this.selectedInTree) {
          console.log(this.selectedInTree);
          rt = this.selectedInTree.replace(reProjectJsonFilename, "");
        }
        return rt;
      },
      buttons () {
        const open = { icon: "mdi-check", label: "open" };
        const create = { icon: "mdi-plus", label: "create" };
        const cancel = { icon: "mdi-close", label: "cancel" };
        const remove = { icon: "mdi-delete", label: "remove" };
        const rt = [cancel];
        switch (this.dialogMode) {
          case "newProject":
            rt.unshift(create);
            break;
          case "removeProject":
            rt.unshift(remove);
            break;
          default:
            rt.unshift(open);
            break;
        }
        return rt;
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
      closeDialog () {
        this.dialog = false;
        this.dialogMode = "default";
        this.selectedInTree = null;
        this.newProjectName = "";
        this.newProjectDescription = "";
        this.dialogTitle = "";
      },
      createProject () {
        const path = `${this.selected}/${this.newProjectName}`;
        SIO.emitHome("addProject", path, this.newProjectDescription);
        this.closeDialog();
      },
      openProject () {
        if (!this.selected) {
          this.dialogMode = "newProject";
          this.dialog = true;
          this.dialogTitle = "create new project";
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
      deleteProjectDialog (item) {
        this.dialogMode = "removeProject";
        this.dialog = true;
        this.removeCandidate = { id: item.id, name: item.name, state: item.state };
        this.dialogTitle = `remove ${item.name} project`;
      },
      removeProject () {
        const item = this.removeCandidate;
        SIO.emitHome("removeProject", item.id);
        this.removeCandidate = null;
        this.dialog = false;
      },
    },
  };
</script>
<style>
.trancated-row{
  max-width: 20vw;
}
</style>
