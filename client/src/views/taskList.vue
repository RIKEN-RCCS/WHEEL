<template>
  <v-treeview
    ref="tree"
    :items="list"
    dense
    open-all
  >
    <template #label="{ item }">
      <div v-if=" ! item.root ">
        <component-button
          :item="item"
        />
      </div>
      <div v-else>
        name
      </div>
    </template>
    <template #append="{item, leaf}">
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
  import SIO from "@/lib/socketIOWrapper.js";
  import { taskStateList2Tree } from "@/lib/taskStateList2Tree.js";
  import componentButton from "@/components/common/componentButton.vue";

  const headers = { state: "state", startTime: "startTime", endTime: "endTime" };

  export default {
    name: "List",
    components: {
      componentButton,
    },
    data: function () {
      return {
        taskStateTree: { children: [], root: true, ...headers },
        headers: Object.keys(headers),
        firstTime: true
      };
    },
    computed: {
      list: function () {
        return [this.taskStateTree];
      },
    },
    mounted: function () {
      SIO.on("taskStateList", async (taskStateList)=>{
        let isChanged=false;
        if(taskStateList.length===0){
          this.taskStateTree = { children: [], root: true, ...headers };
          isChanged=true;
        }else{
          isChanged = await taskStateList2Tree(taskStateList, this.taskStateTree);
        }
        console.log(isChanged);
        console.log(this.firstTime);
        console.log(this.taskStateTree);

        if(this.$refs.tree && (this.firstTime || isChanged)){
          this.firstTime=false;
          this.$refs.tree.updateAll(true);
        }
      });
      SIO.emit("getTaskStateList", (rt)=>{
        console.log("getTaskStateList done", rt);
      });
    },
  };
</script>
<style>
#append{
  width: 50vw;
}
</style>
