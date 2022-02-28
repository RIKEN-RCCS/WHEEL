<template>
  <v-dialog
    v-model="value"
    persistent
    width="auto"
  >
    <v-card>
      <v-card-title>
        {{ title }}
      </v-card-title>
      <v-card-text>
        <slot>
          {{ message }}
        </slot>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
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
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
  export default {
    name: "VersatileDialog",
    props:{
      value: Boolean,
      persistent: {
        type: Boolean,
        default: true
      },
      buttons: {
        type: Array,
        default: function(){
          return [
            { icon: "mdi-check", label: "ok" },
            { icon: "mdi-close", label: "cancel" },
          ];
        }
      },
      title:{
        type: String
      },
      message:{
        type: String
      }
    },
  };
</script>
