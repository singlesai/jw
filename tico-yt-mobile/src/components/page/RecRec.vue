<template>
    <div>
      <van-nav-bar left-text="返回" left-arrow :title="title" @click-left="$router.go(-1)" @click-right="onClickRight">
        <template #right>
          <van-icon name="ellipsis" size="18"/>
        </template>
      </van-nav-bar>
      <van-tabs>
        <van-tab title="发货信息">
          <van-cell :value="data.strSendDate" title="发货日期" @click="show=true"></van-cell>
          <van-calendar v-model:show="show" @confirm="onSelDate"/>
          <van-field v-model="data.carNo" required label="车牌号"></van-field>
          <van-field v-model="data.driverName" required label="司机姓名"></van-field>
          <van-field v-model="data.driverPhone" required label="司机电话"></van-field>
        </van-tab>
        <van-tab title="收货信息">
          <van-cell title="收货单位" :value="data.customer_id?data.customer_id[1]:''"></van-cell>
          <van-cell title="收货地址" :value="data.consignee_address?data.consignee_address:''"></van-cell>
          <van-cell title="项目名称" :value="data.project_id?data.project_id[1]:''"></van-cell>
          <van-cell title="收货人" :value="(data.consignee?data.consignee:'') + '-' + (data.consignee_phone?data.consignee_phone:'')"></van-cell>
        </van-tab>
      </van-tabs>
      <van-divider>明细</van-divider>
      <van-card v-for="(rec,idx) in entry" :key="idx" :num="rec.product_uom_qty+rec.product_uom[1]" :price="rec.online_price" :title="rec.code" :desc="rec.product_id[1]">
        <template #tags>
          <van-tag plain>{{rec.name}}</van-tag>
          <van-tag plain>{{rec.texture}}</van-tag>
          <van-tag v-if="id!==0 && rec.note" plain>{{rec.note}}</van-tag>
        </template>
        <template #footer>
          <van-field v-if="id===0" label="实发数量" v-model="rec.qty" type="number"></van-field>
          <van-field v-if="id===0" label="备注" v-model="rec.note"></van-field>
        </template>
      </van-card>
      <van-action-bar v-if="id===0">
        <van-action-bar-button text="提交" type="danger" @click="onSubmit"></van-action-bar-button>
      </van-action-bar>
      <van-action-sheet v-model:show="showAct" :actions="actions" @select="onAct"/>
    </div>
</template>

<script>
import { Toast, Dialog } from 'vant'
import odooApi from '@/srv'
export default {
  name: 'recRec',
  data () {
    return {
      title: '发货-新增',
      id: 0,
      sid: 0,
      data: {},
      entry: [],
      show: false,
      showAct: false,
      actions: [
        { name: '删除' },
        { name: '列表' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      Toast.loading({forbidClick: true, duration: 0})
      try {
        if (this.$route.query.sid) {
          this.sid = parseInt(this.$route.query.sid)
          var data = await odooApi.model('purchase.order').read([this.sid])
          if (data.length > 0) {
            this.data = data[0]
            this.entry = await odooApi.model('purchase.order.line').read(this.data.order_line)
            var supplier = await odooApi.model('res.partner').read(this.data.partner_id[0], ['property_stock_supplier'])
            this.data.stock = supplier[0].property_stock_supplier
            var customer = await odooApi.model('res.partner').read(this.data.customer_id[0], ['property_stock_customer'])
            this.data.recStock = customer[0].property_stock_customer
          }
          this.actions = [{ name: '列表' }]
        } else {
          this.id = parseInt(this.$route.query.id)
          data = await odooApi.model('delivery.waybill').read([this.id])
          if (data.length > 0) {
            data = data[0]
            this.sid = data.purchase_order_id[0]
            this.title = '发货-' + data.name
            data.strSendDate = data.delivery_date || ''
            data.carNo = data.car_number || ''
            data.driverName = data.driver || ''
            data.driverPhone = data.driver_phone || ''
            data.partner_id = data.supplier_id
            data.stock = data.location_id
            data.recStock = data.location_dest_id
            this.data = data
            var entry = await odooApi.model('delivery.waybill.line').read(this.data.delivery_waybill_line_ids)
            for (var idx in entry) {
              entry[idx].qty = entry[idx].factory_qty
              entry[idx].product_uom_qty = entry[idx].factory_qty
              entry[idx].product_uom = entry[idx].uom_id
              entry[idx].note = entry[idx].remark
              entry[idx].name = entry[idx].brand_id[1]
            }
            this.entry = entry
          }
          this.actions = [{ name: '删除' }, { name: '列表' }]
        }    
        Toast.clear()
      } catch (ex) {
        Toast.clear()
        Toast.fail(ex.message || ex)
      }  
    },
    onClickRight () {
      this.showAct = true
    },
    onDelete () {
      Dialog.confirm({
        title: '删除',
        message: '确定删除记录？'
      }).then(()=>{
        Toast.loading({forbidClick: true, duration: 0})
        odooApi.model('delivery.waybill').unlink([this.id]).then(()=>{
          Toast.clear()
          this.$router.go(-1)
        }).catch(ex=>{
          Toast.clear()
          Toast.fail(ex.message || ex)
        })
      }).catch(()=>{

      })
    },
    onAct (item) {
      switch(item.name) {
        case '删除':
          this.onDelete()
          break
        case '列表':
          this.$router.push('./sendlist?sid=' + this.sid)
          break
      }
    },
    onSelDate (date) {
      this.show = false
      var strMon = '00'+(date.getMonth()+1)
      strMon = strMon.substring(strMon.length-2,strMon.length)
      var strDate = '00'+date.getDate()
      strDate = strDate.substring(strDate.length-2,strDate.len)
      this.data.strSendDate = `${date.getFullYear()}-${strMon}-${strDate}`
      this.data.sendDate = date
    },
    async onSubmit () {
      try{
        if(!this.data.strSendDate) throw('请输入发货日期')
        if(!this.data.carNo) throw('请输入车牌号')
        if(!this.data.driverName) throw('请输入司机姓名')
        if(!this.data.driverPhone) throw('请输入司机 电话')
        var rst = {
          purchase_order_id: this.sid,
          sale_contract_id: this.data.sale_contract_id[0],
          delivery_date: this.data.strSendDate,
          receive_date: this.data.strSendDate,
          car_number: this.data.carNo,
          driver: this.data.driverName,
          driver_phone: this.data.driverPhone,
          supplier_id: this.data.partner_id[0],
          location_id: this.data.stock[0],
          location_dest_id: this.data.recStock[0],
          delivery_waybill_line_ids: []
        }
        for (var idx in this.entry) {
          var entry = this.entry[idx]
          if(entry.qty>0){
            rst.delivery_waybill_line_ids.push([0, false, {
              product_id: entry.product_id[0],
              delivery_address: entry.delivery_address[0],
              factory_qty: entry.qty,
              qty: entry.qty,
              remark: entry.note
            }])
          }
        }
        if(rst.delivery_waybill_line_ids.length<=0) throw('请输入签收数量')
        Toast.loading({forbidClick: true, duration: 0})
        try {
          if (this.id===0) {
            this.id = await odooApi.model('delivery.waybill').create(rst)
          } else {
            await odooApi.model('delivery.waybill').write([this.id], rst)
          } 
          this.$router.go(-1)
        } catch (ex) {
          Toast.clear()
          Toast.fail(ex.message || ex)
        } 
      } catch(ex) {
        Toast.fail(ex.message || ex)
      }          
    }
  }
}
</script>