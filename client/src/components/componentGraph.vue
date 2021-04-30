<template>
  <div id="node_svg" />
</template>

<script>
  import { mapState } from "vuex"
  import SVG from "svgjs/dist/svg.js"
  import "svg.draggable.js/dist/svg.draggable.js"
  import drawComponents from "@/lib/oldSVG/drawComponents.js"

  const widthComponentLibrary = 56
  const heightToolbar = 48
  const heightFooter = 36
  export default {
    name: "ComponentGraph",
    data: function () {
      return {
        svg: null,
      }
    },
    computed: {
      ...mapState(["projectState", "currentComponent"]),
    },
    watch: {
      currentComponent: function () {
        drawComponents(this.currentComponent,
                       this.svg,
                       this.projectState,
                       this.$store.commit.bind(this),
                       this.$store.dispatch.bind(this),
        )
      },
    },
    mounted: function () {
      this.svg = SVG("node_svg")
      this.fit()
      window.addEventListener("resize", this.fit.bind(this))
      drawComponents(this.currentComponent,
                     this.svg,
                     this.projectState,
                     this.$store.commit.bind(this),
                     this.$store.dispatch.bind(this),
      )
    },
    beforeDestroy: function () {
      window.removeEventListener("resize", this.fit.bind(this))
    },
    methods: {
      fit: function () {
        const baseWidth = window.innerWidth < this.$parent.$parent.$el.clientWidth ? window.innerWidth : this.$parent.$parent.$el.clientWidth
        const width = baseWidth - widthComponentLibrary - 1
        const height = window.innerHeight - heightToolbar - heightFooter

        if (width > 0 && height > 0) {
          this.svg.size(width, height)
        }
      },
    },
  }
</script>
