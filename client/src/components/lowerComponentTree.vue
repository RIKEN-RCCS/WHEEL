<template>
  <v-treeview
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
  import componentButton from "@/components/common/componentButton.vue"

  const getSubComponentTree = (targetID, currentNode)=>{
    if (targetID === currentNode.ID) {
      return currentNode
    }
    if (typeof currentNode.children === "undefined" || !Array.isArray(currentNode.children)) {
      return null
    }
    for (const e of currentNode.children) {
      const rt = getSubComponentTree(targetID, e)
      if (rt !== null) {
        return rt
      }
    }
    return null
  }

  export default {
    name: "LowerComponentTree",
    components: {
      componentButton,
    },
    data () {
      return {
        active: [],
      }
    },
    computed: {
      ...mapState(["selectedComponent", "componentPath", "componentTree"]),
      lowerLevelComponents () {
        const targetID = this.selectedComponent.ID
        return getSubComponentTree(targetID, this.componentTree)
      },
    },
    methods: {
      onUpdateActive (actives) {
        console.log(actives)
        this.$emit("selected", actives[0])
      },
    },
  }
</script>
