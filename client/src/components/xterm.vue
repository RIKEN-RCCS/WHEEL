<template>
  <div class="xterm_mount_point" />
</template>
<script>
  import { Terminal } from "xterm";
  import "@/../node_modules/xterm/css/xterm.css";
  import SIO from "@/lib/socketIOWrapper.js";
  const MINIMUM_COLUMNS = 2;
  const MINIMUM_ROWS = 2;
  export default {
    name: "Xterm",
    props: {
      clear: Boolean,
      eventNames: Array,
    },
    data: ()=>{
      return {
        term: null,
        buff: "",
      };
    },
    computed: {
      screenSize: function () {
        return {
        };
      },
    },
    watch: {
      clear: function () {
        this.term.clear();
      },
    },
    mounted: function () {
      this.term = new Terminal({
        bellStyle: "none",
        convertEol: true,
        disableStdin: true,
        logLevel: "info",
      });
      this.term.open(this.$el);

      for (const event of this.eventNames) {
        SIO.on(event, this.writeln.bind(this));
      }
      const unwatch = this.$watch(
        ()=>{
          return {
            width: this.$parent.$parent.$el ? this.$parent.$parent.$el.clientWidth : 0,
            height: this.$parent.$parent.$el ? this.$parent.$parent.$el.clientHeight : 0,
            actualCellWidth: this.term && this.term._core && this.term._core._renderService && this.term._core._renderService.dimensions ? this.term._core._renderService.dimensions.actualCellWidth : 0,
            actualCellHeight: this.term && this.term._core && this.term._core._renderService && this.term._core._renderService.dimensions ? this.term._core._renderService.dimensions.actualCellHeight : 0,
          };
        },
        (newVal, oldVal)=>{
          if (newVal.width > 0 && newVal.height > 0 && newVal.actualCellWidth > 0 && newVal.actualCellHeight > 0) {
            this.fit();

            if (unwatch) {
              unwatch();
            }
          }
        },
        { deep: true },
      );
      window.addEventListener("resize", this.fit.bind(this));
    },
    beforeDestroy: function () {
      window.removeEventListener("resize", this.fit.bind(this));
    },
    methods: {
      fit: function () {
        const width = this.$parent.$parent.$el.clientWidth;
        const height = this.$parent.$parent.$el.clientHeight;
        const actualCellWidth = this.term._core._renderService.dimensions.actualCellWidth; // is 0 when 1st access
        const actualCellHeight = this.term._core._renderService.dimensions.actualCellHeight; // is 0 when 1st access
        const columns = Math.max(MINIMUM_COLUMNS, Math.floor(width / actualCellWidth)) - 1;
        const rows = Math.max(MINIMUM_ROWS, Math.floor(height / actualCellHeight));

        if (Number.isInteger(columns) && Number.isInteger(rows)) {
          this.term.resize(columns, rows);
        }
      },
      writeln: function (data) {
        this.term.writeln(data);
      },
    },
  };
</script>
