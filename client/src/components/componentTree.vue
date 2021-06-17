<template>
  <v-toolbar
    dense
  >
    <v-dialog
      v-model="showComponentTree"
      overlay-opacity="0.9"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          icon
          v-bind="attrs"
          class="ms-12"
          v-on="on"
        >
          <v-icon>mdi-sitemap mdi-rotate-270 </v-icon>
        </v-btn>
      </template>

      <v-treeview
        open-all
        :items="componentTree"
      >
        <template v-slot:label="{ item }">
          <component-button
            :item="item"
            @clicked="goto(item)"
          />
        </template>
      </v-treeview>
    </v-dialog>
    <v-breadcrumbs
      :items="pathToCurrentComponent"
    >
      <template v-slot:divider>
        <v-icon>mdi-forward</v-icon>
      </template>
      <template v-slot:item="{ item }">
        <v-breadcrumbs-item>
          <component-button
            :item="item"
            @clicked="goto(item)"
          />
        </v-breadcrumbs-item>
      </template>
    </v-breadcrumbs>
  </v-toolbar>
</template>

<script>
  import { mapState } from "vuex"
  import getNodeAndPath from "@/lib/getNodeAndPath.js"
  import { isContainer } from "@/lib/utility.js"
  import componentButton from "@/components/common/componentButton.vue"
  import SIO from "@/lib/socketIOWrapper.js"

  export default {
    name: "ComponentTree",
    components: {
      componentButton,
    },
    data: ()=>{
      return {
        showComponentTree: false,
      }
    },
    computed: {
      ...mapState({ tree: "componentTree", currentComponent: "currentComponent" }),
      pathToCurrentComponent: function () {
        const rt = []
        if (this.currentComponent !== null) {
          getNodeAndPath(this.currentComponent.ID, this.tree, rt)
        }
        return rt
      },
      componentTree: function () {
        return [this.tree]
      },
    },
    methods: {
      goto: function (item) {
        const requestID = isContainer(item) ? item.ID : item.parent
        SIO.emit("getWorkflow", requestID)
        this.showComponentTree = false
      },
    },
  }
</script>
