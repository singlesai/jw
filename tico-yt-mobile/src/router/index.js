import { createRouter, createWebHashHistory } from 'vue-router'
import { getLocalStorage } from '@/utils/local-storage'

var routes = [
  {
    path: '/',
    name: 'Mian',
    redirect: '/purord'
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/common/Home.vue'),
    children: [
      {
        path: '/purord',
        name: 'PurOrd',
        component: () => import('../components/page/PurOrd.vue'),
        meta: { title: '采购订单', requiresAuth: true }
      },
      {
        path: '/sendlist',
        name: 'SendList',
        component: () => import('../components/page/SendList.vue'),
        meta: { title: '发运', requiresAuth: true }
      },
      {
        path: '/sendrec',
        name: 'SendRec',
        component: () => import('../components/page/SendRec.vue'),
        meta: { title: '发运', requiresAuth: true }
      },
      {
        path: '/recrec',
        name: 'RecRec',
        component: () => import('../components/page/RecRec.vue'),
        meta: { title: '发运', requiresAuth: true }
      },
      {
        path: '/reclist',
        name: 'RecList',
        component: () => import('../components/page/RecList.vue'),
        meta: { title: '收货', requiresAuth: true}
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/page/Login.vue')
  }
]
var router = createRouter({
	history: createWebHashHistory(),
	routes,
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(route => route.meta.requiresAuth)) {
    var ls = getLocalStorage(['user'])
    if (!ls.user && to.path !== '/login') {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router