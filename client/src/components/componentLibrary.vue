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
          @dragstart.capture="onDragStart($event)"
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
  import { widthComponentLibrary, heightToolbar, heightDenseToolbar } from "@/lib/componentSizes.json"
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
        offsetX: 0,
        offsetY: 0,
      }
    },
    computed: {
      ...mapState(["currentComponent", "canvasWidth", "canvasHeight"]),
      ...mapGetters(["currentComponentAbsPath"]),
      isStepJob: function () {
        if (this.currentComponent === null) return false
        return this.currentComponent.type === "stepjob"
      },
      librarys: function () {
        if (this.isStepJob) {
          return this.componentDefinitions.filter((e)=>{
            return e.type === "stepjobTask"
          })
        }
        return this.componentDefinitions.filter((e)=>{
          return ["task", "if", "for", "while", "foreach", "source", "viewer", "parameterStudy", "workflow", "stepjob", "bulkjobTask"].includes(e.type)
        })
      },
    },
    methods: {
      onDragStart (event) {
        this.offsetX = event.offsetX
        this.offsetY = event.offsetY
      },
      onDragEnd (event, item) {
        const payload = {
          type: item.type,
          pos: {
            x: event.clientX - widthComponentLibrary - this.offsetX,
            y: event.clientY - heightToolbar - heightDenseToolbar * 2 - this.offsetY,
          },
          path: this.currentComponentAbsPath,
        }
        if (payload.pos.x < 0 || this.canvasWidth + widthComponentLibrary < payload.pos.x ||
          payload.pos.y < 0 || this.canvasHeight + heightToolbar + heightDenseToolbar * 2 < payload.pos.y) {
          console.log("DEUBG: out of range drop!", payload.pos)
        }

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
