<template>
  <v-navigation-drawer
    v-if="selectedComponent !== null"
    v-model="open"
    right
    absolute
    :width="propWidth"
  >
    <template slot:prepend>
      <v-toolbar flat>
        <v-toolbar-items>
          <v-form v-model="validName">
            <v-text-field
              v-model.lazy="copySelectedComponent.name"
              label="name"
              outlined
              class="pt-4"
              dense
              :rules="[isValidName, isUniqueName]"
              @change="updateComponentProperty('name')"
              @submit.prevent
            />
          </v-form>
        </v-toolbar-items>
        <v-spacer />
        <v-toolbar-items>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-bind="attrs"
                v-on="on"
                @click="open=false"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </template>
            close
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                :disabled="selectedComponent.state === 'not-started'"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon>mdi-restore</v-icon>
              </v-btn>
            </template>
            clean
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-bind="attrs"
                v-on="on"
                @click="deleteComponent"
              >
                <v-icon>mdi-trash-can-outline</v-icon>
              </v-btn>
            </template>
            delete
          </v-tooltip>
        </v-toolbar-items>
      </v-toolbar>
    </template>
    <v-form
      v-model="valid"
      @submit.prevent
    >
      <v-expansion-panels
        v-model="openPanels"
        multiple
        accordion
      >
        <v-expansion-panel>
          <v-expansion-panel-header>basic</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-textarea
              v-model.lazy="copySelectedComponent.description"
              label="description"
              outlined
              @change="updateComponentProperty('description')"
            />
            <div v-if="isTask">
              <v-autocomplete
                v-model.lazy="copySelectedComponent.script"
                label="script"
                :items="scriptCandidates"
                clearable
                outlined
                @change="updateComponentProperty('script')"
              />
              <v-select
                v-model.lazy="copySelectedComponent.host"
                label="host"
                :items="hostCandidates"
                outlined
                @change="updateComponentProperty('host')"
              />
              <v-switch
                v-model.lazy="copySelectedComponent.useJobScheduler"
                label="use job scheduler"
                @change="updateComponentProperty('useJobScheduler')"
              />
              <v-select
                label="queue"
                :items="queues"
                :disabled="! copySelectedComponent.useJobScheduler"
                outlined
                @change="updateComponentProperty('useJobScheduler')"
              />
            </div>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="isTask">
          <v-expansion-panel-header>retry setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-text-field
              v-model.lazy="copySelectedComponent.retry"
              label="number of retry"
              hide-details
              type="number"
              :rules="[zeroOrMore]"
              outlined
              @change="updateComponentProperty('retry')"
            />
            <v-switch
              v-model.lazy="retryByJS"
              label="use javascript expression for condition check"
            />
            <v-autocomplete
              v-if="!retryByJS"
              v-model.lazy="copySelectedComponent.retryCondition"
              label="script name for confition check"
              :items="scriptCandidates"
              clearable
              outlined
              @change="updateComponentProperty('retryCondition')"
            />
            <v-textarea
              v-if="retryByJS"
              v-model.lazy="copySelectedComponent.retryCondition"
              @change="updateComponentProperty('retryCondition')"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="hasCondition">
          <v-expansion-panel-header>condition setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-switch
              v-model.lazy="conditionCheckByJS"
              label="use javascript expression for condition check"
            />
            <v-autocomplete
              v-if="!conditionCheckByJS"
              v-model.lazy="copySelectedComponent.condition"
              label="script name for confition check"
              :items="scriptCandidates"
              clearable
              outlined
              @change="updateComponentProperty('condition')"
            />
            <v-textarea
              v-if="conditionCheckByJS"
              v-model.lazy="copySelectedComponent.condition"
              @change="updateComponentProperty('condition')"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="isFor">
          <v-expansion-panel-header>loop setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-form @submit.prevent>
              <v-text-field
                v-model.number="copySelectedComponent.start"
                label="start"
                type="number"
                @change="updateComponentProperty('start')"
              />
              <v-text-field
                v-model.number="copySelectedComponent.end"
                label="end"
                type="number"
                @change="updateComponentProperty('end')"
              />
              <v-text-field
                v-model.number="copySelectedComponent.step"
                label="step"
                type="number"
                @change="updateComponentProperty('step')"
              />
            </v-form>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="isForeach">
          <v-expansion-panel-header>loop setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <list-form
              :label="'foreach'"
              :items="indexList"
              @add=" (...args)=>{ updateIndexList('add', ...args)}"
              @remove="(...args)=>{ updateIndexList('remove', ...args)}"
              @update="(...args)=>{ updateIndexList('rename', ...args)}"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="isSource">
          <v-expansion-panel-header>upload setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-switch
              v-model.lazy="copySelectedComponent.uploadOnDemand"
              v-expansion-panel-content
              label="upload on demand"
              @change="updateComponentProperty('uploadOnDemand')"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="isPS">
          <v-expansion-panel-header>PS setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-autocomplete
              v-model.lazy="copySelectedComponent.parameterFile"
              label="parameterFile"
              :items="scriptCandidates"
              clearable
              outlined
              @change="updateComponentProperty('parameterFile')"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>input/output files</v-expansion-panel-header>
          <v-expansion-panel-content>
            <list-form
              :label="'input files'"
              :items="copySelectedComponent.inputFiles"
              :new-item-template="inputFileTemplate"
              @add=" (...args)=>{ changeInputOutputFiles('addInputFile', ...args)}"
              @remove="(...args)=>{ changeInputOutputFiles('removeInputFile', ...args)}"
              @update="(...args)=>{ changeInputOutputFiles('renameInputFile', ...args)}"
            />
            <list-form
              :label="'output files'"
              :items="copySelectedComponent.outputFiles"
              :new-item-template="outputFileTemplate"
              @add=" (...args)=>{ changeInputOutputFiles('addOutputFile', ...args)}"
              @remove="(...args)=>{ changeInputOutputFiles('removeOutputFile', ...args)}"
              @update="(...args)=>{ changeInputOutputFiles('renameOutputFile', ...args)}"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel
          v-if="isTask"
          :disabled="disableRemoteSetting"
        >
          <v-expansion-panel-header>remote file setting</v-expansion-panel-header>
          <v-expansion-panel-content>
            <list-form
              :label="'include'"
              :items="includeList"
              :disabled="disableRemoteSetting"
              @add="addToIncludeList"
              @remove="removeFromIncludeList"
              @update="updateIncludeList"
            />
            <list-form
              :label="'exclude'"
              :items="excludeList"
              :disabled="disableRemoteSetting"
              @add="addToExcludeList"
              @remove="removeFromExcludeList"
              @update="updateExcludeList"
            />
            <v-radio-group
              v-model="copySelectedComponent.cleanupFlag"
              :disabled="disableRemoteSetting"
              @change="updateComponentProperty('cleanupFlag')"
            >
              <v-radio
                label="remove files"
                :value="0"
              />
              <v-radio
                label="keep files"
                :value="1"
              />
              <v-radio
                label="same as parent"
                :value="2"
              />
            </v-radio-group>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>Files</v-expansion-panel-header>
          <v-expansion-panel-content>
            <file-browser :readonly="false" />
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-form>
  </v-navigation-drawer>
</template>

<script>
  import listForm from "@/components/common/listForm.vue";
  import fileBrowser from "@/components/fileBrowser.vue";
  import { isValidName } from "@/lib/utility.js";
  import { glob2Array, addGlobPattern, removeGlobPattern, updateGlobPattern } from "@/lib/clientUtility.js";
  import { mapState, mapGetters, mapMutations } from "vuex";
  import SIO from "@/lib/socketIOWrapper.js";

  const zeroOrMore = (v)=>{
    return v >= 0 ? true : "retry time must be positive value";
  };

  export default {
    name: "ComponentProperty",
    components: {
      listForm,
      fileBrowser,
    },
    data: function () {
      return {
        valid: true,
        validName: true,
        inputFileTemplate: {
          name: "",
          src: [],
        },
        outputFileTemplate: {
          name: "",
          dst: [],
        },
        propWidth: "512",
        openPanels: [0],
        retryByJS: false,
        conditionCheckByJS: false,
        open: false,
        reopening: false,
      };
    },
    watch: {
      open () {
        if (this.reopening || this.open) {
          return;
        }
        this.commitSelectedComponent(null);
      },
      selectedComponent () {
        if (this.selectedComponent === null) {
          return;
        }
        this.reopening = true;
        this.openPanels = [0];
        this.open = false;
        setTimeout(()=>{
          this.open = true;
          this.reopening = false;
        }, 200);
      },
    },
    computed: {
      ...mapState(["selectedComponent", "copySelectedComponent", "remoteHost", "currentComponent", "scriptCandidates", "projectRootDir"]),
      ...mapGetters(["selectedComponentAbsPath"]),
      disableRemoteSetting () {
        return this.copySelectedComponent.host === "localhost";
      },
      isTask () {
        return typeof this.selectedComponent !== "undefined" && this.selectedComponent.type === "task";
      },
      hasCondition () {
        return typeof this.selectedComponent !== "undefined" && ["if", "while"].includes(this.selectedComponent.type);
      },
      isFor () {
        return typeof this.selectedComponent !== "undefined" && this.selectedComponent.type === "for";
      },
      isForeach () {
        return typeof this.selectedComponent !== "undefined" && this.selectedComponent.type === "foreach";
      },
      isSource () {
        return typeof this.selectedComponent !== "undefined" && this.selectedComponent.type === "source";
      },
      isPS () {
        return typeof this.selectedComponent !== "undefined" && this.selectedComponent.type === "parameterStudy";
      },
      includeList: function () {
        if (typeof this.copySelectedComponent.include !== "string") {
          return [];
        }
        return glob2Array(this.copySelectedComponent.include)
          .map((e)=>{
            return { name: e };
          });
      },
      indexList: function () {
        return this.copySelectedComponent.indexList
          .map((e)=>{
            return { name: e };
          });
      },
      excludeList: function () {
        if (typeof this.copySelectedComponent.exclude !== "string") {
          return [];
        }
        return glob2Array(this.copySelectedComponent.exclude)
          .map((e)=>{
            return { name: e };
          });
      },
      hostCandidates () {
        const hostInRemoteHost = this.remoteHost.map((e)=>{
          return e.name;
        });
        return ["localhost", ...hostInRemoteHost];
      },
      queues () {
        const currentHostSetting = this.remoteHost.find((e)=>{
          return e.name === this.copySelectedComponent.host;
        });
        return currentHostSetting ? currentHostSetting.queue.split(",") : [];
      },
    },
    mounted () {
      if (this.selectedComponent !== null) {
        this.open = true;
      }
    },
    methods: {
      ...mapMutations({
        commitScriptCandidates: "scriptCandidates",
        commitComponentTree: "componentTree",
        commitSelectedComponent: "selectedComponent",
      }),
      deleteComponent () {
        SIO.emit("removeNode", this.selectedComponent.ID, (rt)=>{
          if (!rt) {
            return;
          }
          this.commitSelectedComponent(null);
          // update componentTree
          SIO.emit("getComponentTree", this.projectRootDir, (componentTree)=>{
            this.commitComponentTree(componentTree);
          });
        });
      },
      changeInputOutputFiles (event, v, index) {
        if (!this.valid) return;
        const ID = this.selectedComponent.ID;
        // event がrenameInputFile, renameOutputFileの時だけindex引数をもってくれば良い
        if (event === "renameInputFile" || event === "renameOutputFile") {
          SIO.emit(event, ID, index, v.name);
          return;
        }
        SIO.emit(event, ID, v.name);
      },
      updateIndexList (op, e, index) {
        if (op === "add") {
          this.copySelectedComponent.indexList.push(e.name);
        } else if (op === "remove") {
          this.copySelectedComponent.indexList.splice(index, 1);
        } else if (op === "rename") {
          this.copySelectedComponent.indexList[index] = e.name;
        } else {
          return;
        }
        const ID = this.selectedComponent.ID;
        const newValue = this.copySelectedComponent.indexList;
        SIO.emit("updateNode", ID, "indexList", newValue);
      },
      updateComponentProperty (prop) {
        if (prop === "name" && !this.validName) return;
        if (prop !== "name" && !this.valid) return;
        const ID = this.selectedComponent.ID;
        const newValue = this.copySelectedComponent[prop];

        // closeボタン押下時に、selectedComponentをnullにするより先に
        // blurイベントが発生してこちらの処理が走ってしまうので
        // 次行のif文の条件は常に満たさない。
        // 仕様を検討のうえ、ガードするなら何か方法を考える必要がある
        if (this.selectedComponent === null) return;

        SIO.emit("updateNode", ID, prop, newValue, (rt)=>{
          if (prop !== "name" || rt === false) {
            SIO.emit("getComponentTree", this.projectRootDir, (componentTree)=>{
              this.commitComponentTree(componentTree);
            });
          }
        });
      },
      addToIncludeList (v) {
        this.copySelectedComponent.include = addGlobPattern(this.copySelectedComponent.include, v.name);
        this.updateComponentProperty("include");
      },
      addToExcludeList (v) {
        this.copySelectedComponent.exclude = addGlobPattern(this.copySelectedComponent.exclude, v.name);
        this.updateComponentProperty("exclude");
      },
      removeFromIncludeList (v, index) {
        this.copySelectedComponent.include = removeGlobPattern(this.copySelectedComponent.include, v.name, index);
        this.updateComponentProperty("include");
      },
      removeFromExcludeList (v, index) {
        this.copySelectedComponent.exclude = removeGlobPattern(this.copySelectedComponent.exclude, v.name, index);
        this.updateComponentProperty("exclude");
      },
      updateIncludeList (v, index) {
        this.copySelectedComponent.include = updateGlobPattern(this.copySelectedComponent.include, v.name, index);
        this.updateComponentProperty("include");
      },
      updateExcludeList (v, index) {
        this.copySelectedComponent.include = updateGlobPattern(this.copySelectedComponent.include, v.name, index);
        this.updateComponentProperty("exclude");
      },
      isUniqueName (v) {
        const names = this.currentComponent.descendants
          .map((e)=>{
            if (e === null) {
              return null;
            }
            if (e.name === this.selectedComponent.name) {
              return null;
            }
            return e.name;
          })
          .filter((e)=>{
            return e !== null;
          });
        return !names.some((name)=>{
          return name === this.copySelectedComponent.name;
        });
      },
      isValidName,
      zeroOrMore,
    },
  };
</script>
