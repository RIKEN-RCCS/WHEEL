<template>
  <v-treeview
    v-if="lowerLevelComponents!==null"
    open-all
    item-key="ID"
    :items="[ lowerLevelComponents ]"
    :active.sync="active"
    dense
    activatable
    @update:active="onUpdateActive"
  >
    <template v-slot:label="{ item }">
      <component-button
        :item="item"
      />
    </template>
  </v-treeview>
</template>
<script>
  "use strict"
  import { mapState } from "vuex"
  import getNodeAndPath from "@/lib/getNodeAndPath.js"
  import componentButton from "@/components/common/componentButton.vue"

  export default {
    name: "LowerComponentTree",
    components: {
      componentButton,
    },
    data () {
      return {
        active: [],
        lowerLevelComponents: null,
      }
    },
    computed: {
      ...mapState(["selectedComponent", "componentPath", "componentTree"]),
    },
    mounted () {
      const targetID = this.selectedComponent.ID
      this.lowerLevelComponents = getNodeAndPath(targetID, this.componentTree)
    },
    methods: {
      onUpdateActive (actives) {
        const activeComponentID = actives[0]
        const activeComponent = getNodeAndPath(activeComponentID, this.componentTree)
        this.$emit("selected", activeComponent)
      },
    },
  }
</script>
