<template>
  <div>
    <v-icon
      v-if="canEdit"
      small
      class="mr-2"
      @click="$emit('edit', item)"
    >
      mdi-pencil
    </v-icon>
    <v-icon
      v-if="canDelete"
      small
      @click="$emit('delete',item)"
    >
      mdi-delete
    </v-icon>
  </div>
</template>
<script>
  export default {
    name: "ActionRow",
    props: {
      item: [Object, String],
      canEdit: {
        type: Boolean,
        default: true,
      },
      canDelete: {
        type: Boolean,
        default: true,
      },
    },
  }
</script>
