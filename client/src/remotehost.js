import Vue from "vue";
import Remotehost from "./components/Remotehost.vue";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

new Vue({
  vuetify,
  render: function (h) { return h(Remotehost); },
}).$mount("#app");
