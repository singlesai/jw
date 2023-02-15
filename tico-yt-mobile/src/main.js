import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Vant from 'vant'
import 'amfe-flexible'
// import Vconsole from 'vconsole'

// var vConsole = new Vconsole()

createApp(App).use(router).use(Vant).mount('#app')
