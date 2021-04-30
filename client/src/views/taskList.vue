<template>
  <v-treeview
    item-key="subID"
    :items="list"
    dense
    open-all
  >
    <template v-slot:label="{ item }">
      <div v-if=" ! item.root ">
        <component-button
          :item="item"
        />
      </div>
      <div v-else>
        name
      </div>
    </template>
    <template v-slot:append="{item, leaf}">
      <div
        v-if="leaf || item.root"
        id="append"
      >
        <v-row
          no-gutters
          align="center"
        >
          <v-col
            v-for="prop in headers"
            :key="prop"
            :cols="prop === 'state'? 2: 5"
          >
            {{ item[prop] }}
          </v-col>
        </v-row>
      </div>
    </template>
  </v-treeview>
</template>
<script>
  import SIO from "@/lib/socketIOWrapper.js"
  import { taskStateList2Tree } from "@/lib/taskStateList2Tree.js"
  import componentButton from "@/components/common/componentButton.vue"

  const headers = { state: "state", startTime: "startTime", endTime: "endTime" }

  export default {
    name: "List",
    components: {
      componentButton,
    },
    data: function () {
      return {
        taskStateTree: { children: [], root: true, ...headers },
        headers: Object.keys(headers),
      }
    },
    computed: {
      list: function () {
        return [this.taskStateTree]
      },
    },

    mounted: function () {
      SIO.on("taskStateList", async (taskStateList)=>{
        const isChanged = await taskStateList2Tree(taskStateList, this.taskStateTree)
      })
    },
  }
</script>
<style>
#append{
  width: 50vw;
}
</style>
