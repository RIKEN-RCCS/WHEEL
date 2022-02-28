import Vue from "vue";
import Home from "./components/Home.vue";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;

new Vue({
  vuetify,
  render: function (h) { return h(Home); },
}).$mount("#app");
