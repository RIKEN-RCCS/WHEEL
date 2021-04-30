<template>
  <div
    class="text-center"
  >
    <v-bottom-sheet
      v-model="showLogScreen"
      persistent
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          v-bind="attrs"
          v-on="on"
        >
          <v-icon>mdi-triangle-outline</v-icon>
        </v-btn>
      </template>
      <v-sheet
        class="text-center"
      >
        <v-btn
          icon
          @click="showLogScreen=!showLogScreen"
        >
          <v-icon>mdi-triangle-outline mdi-rotate-180</v-icon>
        </v-btn>
        <v-toolbar>
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
          >
            <xterm
              :clear="item.clear"
              :event-names="item.eventNames"
            />
          </v-tab-item>
        </v-tabs-items>
      </v-sheet>
    </v-bottom-sheet>
  </div>
</template>

<script>
  import xterm from "@/components/xterm.vue"
  export default {
    name: "LogScreen",
    components: {
      xterm,
    },
    data: ()=>{
      return {
        showLogScreen: false,
        currentTab: 1,
        items: [
          { label: "debug", id: "debug", clear: false, eventNames: [] },
          { label: "info", id: "info", clear: false, eventNames: ["logINFO", "logWARN", "logERR"] },
          { label: "stdout", id: "stdout", clear: false, eventNames: ["logSTDOUT"] },
          { label: "stderr", id: "stderr", clear: false, eventNames: ["logSTDERR"] },
          { label: "stdout(SSH)", id: "sshout", clear: false, eventNames: ["logSSHOUT"] },
          { label: "stderr(SSH)", id: "ssherr", clear: false, eventNames: ["logSSHERR"] },
        ],
      }
    },
    methods: {
      clearAllLog: function () {
        // $refsでxtermコンポーネントのclear()を呼び出す方法を使うと
        // Vue2 -> Vue3の移行時に作業量が増えるため、workaroundとしてclear propに変更があったり
        // xtermコンポーネントでclearを実行するようにしている。
        for (const item of this.items) {
          item.clear = !item.clear
        }
      },
    },
  }
</script>
<style scoped>
.v-tabs {
  width: 100%;
  height: 100%;
}
.v-window {
  height: calc(100% - 48px);
}
.v-tab__items,
.v-window-item,
.v-window >>> div.v-window__container {
  height: 100%;
}
</style>
