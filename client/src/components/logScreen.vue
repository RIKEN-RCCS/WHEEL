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
        show-arrows
        grow
      >
        <v-tab
          v-for="item in items"
          :key="item.id"
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
    data: ()=>{
      return {
        currentTab: 1,
        items: [
          { label: "debug", id: "debug", clear: false, eventNames: ["logDBG"] },
          { label: "info", id: "info", clear: false, eventNames: ["logINFO", "logWARN", "logERR"] },
          { label: "stdout", id: "stdout", clear: false, eventNames: ["logStdout"] },
          { label: "stderr", id: "stderr", clear: false, eventNames: ["logStderr"] },
          { label: "stdout(SSH)", id: "sshout", clear: false, eventNames: ["logSSHout"] },
          { label: "stderr(SSH)", id: "ssherr", clear: false, eventNames: ["logSSHerr"] },
        ],
      };
    },
    methods: {
      clearAllLog: function () {
        // $refsでxtermコンポーネントのclear()を呼び出す方法を使うと
        // Vue2 -> Vue3の移行時に作業量が増えるため、workaroundとしてclear propに変更があったり
        // xtermコンポーネントでclearを実行するようにしている。
        for (const item of this.items) {
          item.clear = !item.clear;
        }
      },
    },
  };
</script>
