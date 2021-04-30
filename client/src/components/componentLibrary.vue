<template>
  <v-navigation-drawer
    permanent
    mini-variant
  >
    <v-list
      id="iconlist"
      nav
    >
      <v-list-item
        v-for="item in librarys"
        :key="item.type"
      >
        <v-list-item-avatar
          :color="item.color"
          tile
          draggable
          @dragstart.capture.stop
          @dragend.capture="onDragEnd($event, item)"
        >
          <v-tooltip
            right
            :color="item.color"
          >
            <template v-slot:activator="{ on, attrs }">
              <img
                :src="item.img"
                :alt="item.type"
                v-bind="attrs"
                v-on="on"
              >
            </template>
            <span>{{ item.type }}</span>
          </v-tooltip>
        </v-list-item-avatar>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
<script>
  import { mapState, mapGetters } from "vuex"
  import SIO from "@/lib/socketIOWrapper.js"
  import loadComponentDefinition from "@/lib/componentDefinision.js"
  const componentDefinitionObj = loadComponentDefinition()
  export default {
    name: "ComponentLibrary",
    data: ()=>{
      return {
        componentDefinitions: Object.keys(componentDefinitionObj).map((e)=>{
          return {
            type: e,
            ...componentDefinitionObj[e],
          }
        }),
      }
    },
    computed: {
      ...mapState(["currentComponent"]),
      ...mapGetters(["currentComponentAbsPath"]),
      isStepJob: function () {
        if (this.currentComponent === null) return false
        return this.currentComponent.type === "steapjob"
      },
      librarys: function () {
        if (this.isStepJob) {
          return this.componentDefinitions.filter((e)=>{
            return e.type === "stepjobTask"
          })
        }
        return this.componentDefinitions.filter((e)=>{
          return ["task", "if", "for", "while", "foreach", "source", "viewer", "parameterStudy", "workflow", "stepjob"].includes(e.type)
        })
      },
    },
    methods: {
      onDragEnd (event, item) {
        const payload = {
          type: item.type,
          pos: { x: event.offsetX, y: event.offsetY },
          path: this.currentComponentAbsPath,
        }
        // TODO あたり判定をつけて、svgの領域の中の時だけemitする
        SIO.emit("createNode", payload, (rt)=>{
          if (rt !== true) return
          // update component Map
          SIO.emit("getProjectJson")
        })
      },
    },
  }
</script>
<style scoped>
#iconlist {
  padding: 0;
}
</style>
