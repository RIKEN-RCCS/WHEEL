<template>
  <v-dialog
    v-model="openDialog"
    :max-width="maxWidth"
  >
    <v-card>
      <v-card-title>
        {{ title }}
      </v-card-title>
      <v-card-text>
        {{ message }}
        <v-list
          dense
          disabled
          flat
        >
          <v-list-item
            v-for="(item, i) in removeCandidates"
            :key="i"
          >
            {{ item }}
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <buttons
          :buttons="buttons"
          @remove="remove"
          @cancel="closeDialog"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
  import buttons from "@/components/common/buttons.vue";
  export default {
    name: "RemoveConfirmDialog",
    components: {
      buttons,
    },
    props: {
      value: Boolean,
      title: { type: String, default: "are you sure you want to remove?" },
      message: String,
      removeCandidates: { type: Array, default: ()=>{ return []; } },
      maxWidth: { type: String, default: "50%" },
    },
    data: function () {
      return {
        buttons: [
          { icon: "mdi-trash-can-outline", label: "remove" },
          { icon: "mdi-close", label: "cancel" },
        ],
      };
    },
    computed: {
      openDialog: {
        get () {
          return this.value;
        },
        set (value) {
          this.$emit("input", value);
        },
      },
    },
    methods: {
      remove () {
        this.$emit("remove");
        this.closeDialog();
      },
      closeDialog () {
        this.openDialog = false;
      },
    },
  };
</script>
