<template>
  <v-btn-toggle>
    <div
      v-for="item in buttons"
      :key="item.label"
    >
      <v-btn
        @click="$emit(item.label)"
      >
        <v-icon>
          {{ item.icon }}
        </v-icon>
        {{ item.label }}
      </v-btn>
    </div>
  </v-btn-toggle>
</template>
<script>

/**
 * @type Button
 * @prop {string} icon
 * @prop {string} label
 */
  export default {
    name: "Buttons",
    props: {
      buttons: Array,
      openDialog: { type: Boolean, default: false },
    },
  };
</script>
