<template>
  <div id="node_svg" />
</template>

<script>
  import { mapState, mapMutations } from "vuex"
  import SVG from "svgjs/dist/svg.js"
  import "svg.draggable.js/dist/svg.draggable.js"
  import drawComponents from "@/lib/oldSVG/drawComponents.js"
  import { widthComponentLibrary, heightToolbar, heightDenseToolbar, heightFooter } from "@/lib/componentSizes.json"
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
      ...mapMutations(
        {
          commitCanvasWidth: "canvasWidth",
          commitCanvasHeight: "canvasHeight",
        }),
      fit: function () {
        const baseWidth = window.innerWidth < this.$parent.$parent.$el.clientWidth ? window.innerWidth : this.$parent.$parent.$el.clientWidth
        const width = baseWidth - widthComponentLibrary - 1
        const height = window.innerHeight - heightToolbar - heightDenseToolbar * 2 - heightFooter

        if (width > 0 && height > 0) {
          this.commitCanvasWidth(width)
          this.commitCanvasHeight(height)
          this.svg.size(width, height)
        }
      },
    },
  }
</script>
