<template>
  <v-btn
    :color="componentDefinition[item.type].color"
    class="custom-transform-class text-none"
    @click="$emit('clicked')"
  >
    <img
      :src="componentDefinition[item.type].img"
      :alt="componentDefinition[item.type].type"
    >
    {{ item.name }}
  </v-btn>
</template>
<script>
  "use strict"
  import loadComponentDefinition from "@/lib/componentDefinision.js"
  export default {
    name: "ComponentButton",
    props: { item: Object },
    data: ()=>{
      return {
        componentDefinition: loadComponentDefinition(),
      }
    },

  }
</script>
