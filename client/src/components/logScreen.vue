<template>
  <v-sheet
    class="text-center"
  >
    <v-toolbar
      dense
    >
      <v-btn
        @click="clearAllLog"
      >
        clear all log
      </v-btn>
      <v-tabs
        v-model="currentTab"
        @change="onChange"
      >
        <v-tab
          v-for="item in items"
          :key="item.id"
          :class="{'success--text': item.unread }"
        >
          {{ item.label }}
        </v-tab>
      </v-tabs>
    </v-toolbar>
    <v-tabs-items
      v-model="currentTab"
    >
      <v-tab-item
        v-for="item of items"
        :key="item.id"
        eager
        :transition="false"
        :reverse-transition="false"
      >
        <xterm
          :clear="item.clear"
          :event-names="item.eventNames"
          @newlog="newlog(item)"
        />
      </v-tab-item>
    </v-tabs-items>
  </v-sheet>
</template>

<script>
  import xterm from "@/components/xterm.vue";
  export default {
    name: "LogScreen",
    components: {
      xterm,
    },
    props:{
      show: Boolean
    },
    data: ()=>{
      return {
        currentTab: 1,
        items: [
          { label: "debug", id: "debug",        clear: 0, unread: false, eventNames: ["logDBG"] },
          { label: "info", id: "info",          clear: 0, unread: false, eventNames: ["logINFO", "logWARN", "logERR"] },
          { label: "stdout", id: "stdout",      clear: 0, unread: false, eventNames: ["logStdout"] },
          { label: "stderr", id: "stderr",      clear: 0, unread: false, eventNames: ["logStderr"] },
          { label: "stdout(SSH)", id: "sshout", clear: 0, unread: false, eventNames: ["logSSHout"] },
          { label: "stderr(SSH)", id: "ssherr", clear: 0, unread: false, eventNames: ["logSSHerr"] },
        ],
      };
    },
    watch:{
      show(){
        if(!this.show){
          return;
        }
        this.onChange(this.currentTab);
      }
    },
    methods: {
      newlog: function(item){
        item.unread = item.id !== this.items[this.currentTab].id;
      },
      onChange: function(n){
        this.items[n].unread = false;
      },
      clearAllLog: function () {
        // $refsでxtermコンポーネントのclear()を呼び出す方法を使うと
        // Vue2 -> Vue3の移行時に作業量が増えるため、workaroundとしてclear propに変更があったり
        // xtermコンポーネントでclearを実行するようにしている。
        for (const item of this.items) {
          item.unread=false;
          item.clear = (item.clear+1)%2;
        }
      },
    },
  };
</script>
