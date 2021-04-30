<template>
  <div
    id="hoge"
  >
    <componentTreeComponent
      :tree="componentTree"
    />
    <v-row
      no-gutters
    >
      <componentLibrary />
      <componentGraph />
      <componentProperty />
    </v-row>
  </div>
</template>

<script>
  import componentGraph from "@/components/componentGraph.vue"
  import componentLibrary from "@/components/componentLibrary.vue"
  import componentProperty from "@/components/componentProperty.vue"
  import componentTreeComponent from "@/components/componentTree.vue"

  export default {
    name: "Graph",
    components: {
      componentGraph,
      componentLibrary,
      componentProperty,
      componentTreeComponent,
    },
    props: {
      componentTree: Object,
    },
    data: ()=>{
      return {
        showComponentTree: false,
      }
    },
    computed:
      {
        showProperty: function () {
          return this.$store.state.selectedComponent !== null
        },
      },
  }
</script>
