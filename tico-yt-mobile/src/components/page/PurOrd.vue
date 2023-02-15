<template>
    <div>
        <van-nav-bar title="退货计划" @click-right="onClickRight">
          <template #right>
            <van-icon name="ellipsis" size="18"/>
          </template>
        </van-nav-bar>
        <van-search v-model="strFilter" aria-placeholder="请输入搜索关键词" show-action @search="onSearch" @cancel="onCancel"/>
        <template v-for="(rec,idx) in data" :key="idx">
          <!--van-divider>{{rec.name}}[{{rec.project_id[1]}}]</van-divider-->
          <van-card :num="rec.stock_return_plan_line.length" :title="rec.name" :desc="rec.project_id[1]">
            <template #tags>
              <van-tag plain v-if="rec.stock_id[1]">{{rec.stock_id[1]}}</van-tag>
              <van-tag plain v-if="rec.partner_id[1]">{{rec.partner_id[1]}}</van-tag>
              <van-tag plain v-if="rec.sale_id[1]">{{rec.sale_id[1]}}</van-tag>
            </template>
            <template #footer>
              <van-button size="mini" @click="onAddDest(rec.id)">现场签收</van-button>
            </template>
          </van-card>
        </template>
        
        <!--van-cell v-for="(rec,idx) in data" :key="idx" center is-link :title="rec.name" :label="rec.project_id[1]" :value="rec.transport_waybill_count" :url="'./index.html#/sendlist?sid='+rec.id">
        </van-cell-->
        <van-divider v-if="right===false">无权限</van-divider>
        <van-action-sheet v-model:show="showAct" :actions="actions" @select="onAct"/>
    </div>
</template>

<script>
import { Toast, Dialog } from 'vant'
import { getLocalStorage } from '@/utils/local-storage'
import odooApi from '@/srv'
export default {
  name: 'purOrd',
  data () {
    return {
      right: false,
      showAct: false,
      strFilter: '',
      data: [],
      actions: [
        { name: '历史签收' },
        { name: '退出登录' }
      ]
    }
  },
  mounted () {
    this.onSearch()
  },
  methods: {
    async onSearch () {
      Toast.loading({forbidClick: true, duration: 0})
      try {
        this.right = await odooApi.model('stock.return.plan').checkAccessRights()
        if(this.right) {
          var domain = []
          domain.push(['approval_state', '=', 'approval_confirm'])
          if (this.strFilter) {
            domain.push('|')
            domain.push(['name', 'ilike', this.strFilter])
            domain.push('|')
            domain.push(['project_id', 'ilike', this.strFilter])
            domain.push(['stock_id.name', 'ilike', this.strFilter])
          }
          this.data = await odooApi.model('stock.return.plan').searchRead(domain, ['name', 'partner_id', 'project_id', 'stock_id', 'sale_id', 'stock_return_plan_line'], 0, 100, 'create_date desc')
          var ids = []
          for(var idx in this.data) {
            ids = ids.concat(this.data[idx].order_line)
          }
          /*
          var entry = await odooApi.model('stock.return.plan.line').read(ids)
          for(idx in this.data) {
            this.data[idx].entry = entry.filter(rec => { return rec.order_id[0] === this.data[idx].id})
          }
          */
        }
        Toast.clear()
      } catch (ex) {
        Toast.clear()
        Toast.fail(ex.message || ex)
      }
    },
    onClickRight () {
      this.showAct = true
      /*
      Dialog.confirm({
        title: '退出',
        message: '确定退出登录？'
      }).then(()=>{
        this.$router.push({name: 'Login'})
      }).catch(()=>{

      })
      */
    },
    onAct (item) {
      switch(item.name) {
        case '历史签收':
          // this.onDelete()
          this.$router.push('./sendlist')
          break
        case '退出登录':
          Dialog.confirm({
            title: '退出',
            message: '确定退出登录？'
          }).then(()=>{
            this.$router.push({name: 'Login'})
          }).catch(()=>{

          })
          break
      }
    },
    onAddDest (rec) {
      var loginRst = getLocalStorage('user')
      if (loginRst.isCust) {
        this.$router.push('./recrec?sid=' + rec)
      } else {
        this.$router.push('./sendrec?sid=' + rec)
      }
      console.log(rec)
    },
    onCancel () {
      this.strFilter = ''
    }
  }
}
</script>