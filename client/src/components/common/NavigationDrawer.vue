<template>
  <v-navigation-drawer
    v-model="drawer"
    app
    temporary
    right
    cliped
  >
    <v-list
      nav
      dense
    >
      <a
        href="/remotehost"
        target="_blank"
      >
        <v-list-item>
          <v-list-item-icon>
            <v-icon>mdi-cog-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-title>
            Remotehost editor
          </v-list-item-title>
        </v-list-item>
      </a>
      <a
        href="/jobScript"
        target="_blank"
      >
        <v-list-item>
          <v-list-item-icon>
            <v-icon>mdi-file-document-edit-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-title>
            Jobscript editor
          </v-list-item-title>
        </v-list-item>
      </a>
      <a
        href="https://riken-rccs.github.io/WHEEL/"
        target="_blank"
      >
        <v-list-item>
          <v-list-item-icon>
            <v-icon>mdi-help-circle-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-title>User guide</v-list-item-title>
        </v-list-item>
      </a>
    </v-list>
  </v-navigation-drawer>
</template>
<script>
  export default {
    name: "NavDrawer",
    props: {
      value: Boolean,
    },
    computed: {
      drawer: {
        get () {
          return this.value;
        },
        set (value) {
          this.$emit("input", value);
        },
      },
    },
  };
</script>
