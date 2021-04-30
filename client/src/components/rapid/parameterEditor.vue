<!--
Copyright (c) Center for Computational Science, RIKEN All rights reserved.
Copyright (c) Research Institute for Information Technology(RIIT), Kyushu University. All rights reserved.
See License.txt in the project root for the license information.
-->
<template>
  <div>
    <target-files
      :files="files"
      :target-files="parameterSetting.targetFiles"
      @open-new-tab="$emit('openNewTab')"
    />
    <parameter
      :keyword="selectedText"
      :params="parameterSetting.params"
      @newParamAdded="$emit('insertBraces')"
    />
    <gather-scatter
      :container="parameterSetting.scatter"
      :headers="[ { value: 'srcName', text: 'srcName', sortable: true },
                  { value: 'dstName', text: 'dstName', sortable: true },
                  { value: 'dstNode', text: 'dstNode', sortable: true},
                  { text: 'Actions', value: 'action', sortable: false }]"
      :label="'scatter'"
    />
    <gather-scatter
      :container="parameterSetting.gather"
      :headers="[ { value: 'srcName', text: 'srcName', sortable: true },
                  { value: 'srcNode', text: 'srcNode', sortable: true},
                  { value: 'dstName', text: 'dstName', sortable: true },
                  { text: 'Actions', value: 'action', sortable: false }]"
      :label="'gather'"
    />
  </div>
</template>
<script>
  "use strict"
  import { mapState } from "vuex"
  import targetFiles from "@/components/rapid/targetFiles.vue"
  import gatherScatter from "@/components/rapid/gatherScatter.vue"
  import parameter from "@/components/rapid/parameter.vue"

  export default {
    name: "ParameterEditor",
    components: {
      targetFiles,
      gatherScatter,
      parameter,
    },
    props: {
      files: Array,
      parameterSetting: Object,
    },

    data: function () {
      return {
      }
    },
    computed: {
      ...mapState(["currentDir", "selectedFile", "selectedText"]),
    },
    mounted () {
    },
  }
</script>
