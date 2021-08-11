import Vue from "vue";
import Workflow from "./Workflow.vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: function (h) { return h(Workflow); },
}).$mount("#app");
