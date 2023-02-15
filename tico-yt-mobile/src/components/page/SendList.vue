<template>
    <div>
        <van-nav-bar left-text="返回" left-arrow :title="title"  @click-left="$router.go(-1)">
        </van-nav-bar>
        <van-search v-model="strFilter" aria-placeholder="请输入搜索关键词" show-action @search="onSearch" @cancel="onCancel"/>
        <template v-for="(rec,idx) in data" :key="idx">
          <!--van-divider>{{rec.name}}[{{rec.project_id[1]}}]</van-divider-->
          <van-card :num="rec.actual_received_line_ids.length" :title="rec.name" :desc="rec.project_id?rec.project_id[1]:''">
            <template #tags>
              <van-tag plain v-if="rec.stock_id[1]">{{rec.stock_id[1]}}</van-tag>
              <van-tag plain v-if="rec.partner_id[1]">{{rec.partner_id[1]}}</van-tag>
              <van-tag plain v-if="rec.sale_id[1]">{{rec.sale_id[1]}}</van-tag>
            </template>
            <template #footer>
              <van-button size="mini" @click="onAddDest(rec.id)">编辑</van-button>
              <van-button size="mini" @click="onDel(rec.id)">删除</van-button>
            </template>
          </van-card>
        </template>
        
        <!--van-cell v-for="(rec,idx) in data" :key="idx" center is-link :title="rec.name" :label="rec.project_id[1]" :value="rec.transport_waybill_count" :url="'./index.html#/sendlist?sid='+rec.id">
        </van-cell-->
        <van-divider v-if="right===false">无权限</van-divider>
    </div>
</template>

<script>
import { Toast, Dialog } from 'vant'
import odooApi from '@/srv'
export default {
  name: 'sendList',
  data () {
    return {
      title: '历史签收',
      sid: 0,
      ordNo: '',
      right: false,
      data: []
    }
  },
  mounted () {
    this.onSearch()
  },
  methods: {
    async onSearch () {
      Toast.loading({forbidClick: true, duration: 0})
      try {
        this.right = await odooApi.model('stock.return.received').checkAccessRights()
        if(this.right) {
          var domain = []
          if (this.strFilter) {
            domain.push('|')
            domain.push(['name', 'ilike', this.strFilter])
            domain.push('|')
            domain.push(['project_id', 'ilike', this.strFilter])
            domain.push(['stock_id.name', 'ilike', this.strFilter])
          }
          this.data = await odooApi.model('stock.return.received').searchRead(domain, ['name', 'partner_id', 'project_id', 'stock_id', 'sale_id', 'actual_received_line_ids'], 0, 100, 'create_date desc')
          /*
          var ids = []
          for(var idx in this.data) {
            ids = ids.concat(this.data[idx].order_line)
          }
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
    onDel (id) {
      Dialog.confirm({
        title: '删除',
        message: '确定删除记录？'
      }).then(()=>{
        console.log(id)
      }).catch(()=>{

      })
    },
    onAddDest (rec) {
      this.$router.push('./sendrec?id=' + rec)
      console.log(rec)
    },
    onCancel () {
      this.strFilter = ''
    }
  }
}
</script>