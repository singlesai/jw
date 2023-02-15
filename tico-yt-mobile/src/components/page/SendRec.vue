<template>
    <div class="send-rec">
      <van-nav-bar left-text="返回" left-arrow :title="title" @click-left="$router.push('./purord')" @click-right="onClickRight">
        <template #right>
          <van-icon name="ellipsis" size="18"/>
        </template>
      </van-nav-bar>
      <van-tabs v-model:active="active">
        <van-tab title="收货信息">
          <van-field is-link readonly v-model="data.stockName" required label="仓库" @click="showStockPicker=true"></van-field>
          <van-popup v-model:show="showStockPicker" round position="bottom">
            <van-picker :columns="stocks" @cancel="showStockPicker=false" @confirm="onConfirmStock"></van-picker>
          </van-popup>
          <van-field v-model="data.addr" label="收货地址"></van-field>
          <van-field is-link readonly v-model="data.supName" required label="运输供应商" @click="showSupPicker=true"></van-field>
          <van-popup v-model:show="showSupPicker" round position="bottom">
            <van-picker :columns="sups" @cancel="showSupPicker=false" @confirm="onConfirmSup"></van-picker>
            <van-search v-model="supSearch" @search="onSearchSup"></van-search>
          </van-popup>
          <van-field v-model="data.receiver" required label="签收人"></van-field>
          <van-field v-model="data.receiverPhone" required label="签收人电话"></van-field>
          <van-field v-model="data.desc" label="现场说明"></van-field>
          <van-cell :value="data.strSendDate" required title="发货日期" @click="show=true"></van-cell>
          <van-calendar v-model:show="show" @confirm="onSelDate"/>
          <van-field v-model="data.carNo" required label="车牌号"></van-field>
          <van-field v-model="data.driverName" required label="司机姓名"></van-field>
          <van-field v-model="data.driverPhone" required label="司机电话"></van-field>
        </van-tab>
        <van-tab title="计划信息">
          <van-field v-model="data.name" readonly label="计划单号"></van-field>
          <van-field v-model="data.projectName" readonly label="项目"></van-field>
          <van-field v-model="data.senderName" readonly label="发货人"></van-field>
          <van-field v-model="data.senderPhone" readonly label="发货人电话"></van-field>
          <van-field v-model="data.loanProduct" readonly label="单独计租产品"></van-field>
        </van-tab>
        <van-tab title="过磅信息">
          <van-field v-model="data.weightTypeName" readonly label="计重方式"></van-field>
          <van-field v-model="data.custWeight" :required="data.weightTypeName && data.weightTypeName.includes('过磅')" label="客户总重"></van-field>
          <van-field v-model="data.custNet" :required="data.weightTypeName && data.weightTypeName.includes('过磅')" label="客户皮重"></van-field>
          <van-field v-model="data.weight" readonly label="计算重量"></van-field>
        </van-tab>
      </van-tabs>
      
      
      <van-divider>明细</van-divider>
      <van-card v-for="(rec,idx) in entry" :key="idx" :title="rec.product[1]" :desc="'在租:' + rec.loaned?'0':rec.loaned" :num="rec.weight">
        <template #tags>
          <van-tag plain v-for="loss in rec.loss.filter(e=>{return e.qty!==undefined && e.qty>0})" :key="loss.lossType.id">{{loss.lossType.name}}:{{loss.qty}}</van-tag>
        </template>
        <template #footer>
          <van-field type="digit" v-model="rec.returnQty" label="退货数量"/>
          <van-field type="digit" v-model="rec.scrapQty" label="报废数量"/>
          <van-field type="digit" v-model="rec.overQty" label="翻包数量"/>
          <van-button size="mini" @click="delRec(rec)">删除</van-button>
          <van-button v-if="rec.loss.length>0" size="mini" @click="showDetail(rec)">损坏明细</van-button>
        </template>
      </van-card>
      <br/>
      <br/>
      <br/>
      <van-action-bar>
        <van-action-bar-button v-if="!id" text="添加产品" type="danger" @click="showProductPicker=true"></van-action-bar-button>
        <van-dialog v-model:show="showProductPicker" show-cancel-button @confirm="onSelProduct">
          <van-tree-select v-model:active-id="selectedProduct" v-model:main-active-index="selectedProductCateg" :items="productTree" height="90vw"></van-tree-select>
        </van-dialog>
        <van-action-bar-button v-if="!id && entry.length>0" text="提交" type="danger" @click="onSubmit"></van-action-bar-button>
        <van-action-bar-button v-if="id" text="打印" type="danger" @click="onPrint"></van-action-bar-button>
      </van-action-bar>
      <van-action-sheet v-model:show="showAct" :actions="actions" @select="onAct"/>
      <van-dialog v-model:show="loss.show" :title="loss.title" style="max-height: 70%!important;overflow: auto">
        <template v-for="rec in loss.data" :key="rec.lossType.id">
          <van-field v-model="rec.qty" :label="rec.lossType.name" type="digit"></van-field>
        </template>
      </van-dialog>
      <pdf v-if="pdfUri" :src="pdfUri" :page="1"></pdf>
    </div>
</template>

<script>
import { Toast, Dialog } from 'vant'
import odooApi from '@/srv'
import pdf from 'vue-pdf'
import PdfPrint from '@/utils/pdfPrint'
export default {
  name: 'sendRec',
  components: {pdf},
  data () {
    return {
      title: '现场签收',
      id: 0,
      sid: 0,
      data: {},
      showStockPicker: false,
      stocks: [],
      showSupPicker: false,
      sups: [],
      supSearch: '',
      showProductPicker: false,
      products: [],
      productTree: [],
      selectedProduct: [],
      selectedProductCateg: [],
      entry: [],
      show: false,
      showAct: false,
      productLoaned: {},
      actions: [
        { name: '删除' },
        { name: '列表' }
      ],
      loss: {
        show: false,
        title: '',
        data: {}
      },
      pdfUri: ''
    }
  },
  watch: {
    entry: {
      handler(n) {
        var weight = 0.00
        for (var idx in n) {
          weight += Number(n[idx].returnQty) * n[idx].weight
        }
        this.data.weight = (weight / 1000).toFixed(3)
      },
      deep: true
    }
  },
  mounted () {
    this.load(this.$route.query.sid, this.$route.query.id)
  },
  methods: {
    async load (sid, id) {
      Toast.loading({forbidClick: true, duration: 0})
      try {
        var stocks = await odooApi.model('stock.warehouse').searchRead([], ['id', 'name', 'lot_stock_id'])
        for (var iidx in stocks) {
          this.stocks.push({value: stocks[iidx].id, text: stocks[iidx].name, defLoc: stocks[iidx].lot_stock_id})
        }
        var sups = await odooApi.model('res.partner').searchRead([['supplier_rank', '>', 0]], ['id', 'name'])
        for (iidx in sups) {
          this.sups.push({value: sups[iidx].id, text: sups[iidx].name})
        }
        
        var productLoss = await odooApi.model('product.loss').searchRead([])
        console.log('los', productLoss)
        if (sid) {
          this.sid = parseInt(sid)
          var data = await odooApi.model('stock.return.plan').read(this.sid , ['id', 'name', 'partner_id', 'project_id', 'consignee', 'consignee_phone', 'weight_form_id', 'stock_return_plan_line']) //
          // var data = await odooApi.model('stock.return.plan').searchRead([['id', '=', this.sid]], ['id', 'partner_id', 'project_id', 'consignee', 'consignee_phone', 'weight_form_id', 'stock_return_plan_line']) 
          if (data.length > 0) {
            data[0].carNo = data[0].number_plate
            data[0].driverName = data[0].driver
            data[0].driverPhone = data[0].driver_Phone
            data[0].projectName = data[0].project_id[1]
            data[0].projectId = data[0].project_id[0]
            data[0].senderName = data[0].consignee
            data[0].senderPhone = data[0].consignee_phone
            data[0].weightTypeName = data[0].weight_form_id[1]
            data[0].weightType = data[0].weight_form_id[0]
            this.data = data[0]
            this.entry = []
            /*
            var recs = await odooApi.model('stock.return.plan.line').read(this.data.stock_return_plan_line)
            var entry = []
            for (var idx in recs) {
              var rec = recs[idx]
              var products = await odooApi.model('product.product').read(rec.product_id[0], ['id', 'product_loss_ids'])
              var product_loss = await odooApi.model('product.loss').read(products[0].product_loss_ids, ['id', 'name'])
              var lossType = []
              for (var kdx in product_loss) {
                lossType.push({lossType: product_loss[kdx], qty: undefined})
              }
              entry.push({ product: rec.product_id, uom: rec.uom_id, qty: rec.qty, returnQty: 0, loss: lossType})
              productIds.push(rec.product_id[0])
            }
            this.entry = entry
            */
          }
          data = await odooApi.model('crm.lead').read(this.data.projectId, ['material_remark', 'business_type'])
          if (data[0]) {
            this.data.loanProduct = data[0].material_remark
            this.data.businessType = data[0].business_type
          }
          this.actions = [{ name: '列表' }]
        } else {
          this.id = parseInt(id)
          data = await odooApi.model('stock.return.received').read([this.id])
          if (data.length > 0) {
            data = data[0]
            this.title = '现场签收-' + data.name
            data.strSendDate = data.return_date || ''
            data.carNo = data.number_plate || ''
            data.driverName = data.driver || ''
            data.driverPhone = data.driver_phone || ''
            data.projectName = data.project_id[1]
            data.projectId = data.project_id[0]
            data.senderName = data.sender,
            data.senderPhone = data.sender_phone,
            data.desc = data.description,
            data.addr = data.address,
            data.weightType = data.weight_form_id[0],
            data.weightTypeName = data.weight_form_id[1],
            data.custWeight = data.total_weight,
            data.custNet = data.tare_weight,
            data.receiverPhone = data.receiver_phone,
            data.stockName = data.stock_id[1]
            data.stock = data.stock_id[0]
            data.supName = data.partner_id?data.partner_id[1]:''
            data.sup = data.pratner_id?data.partner_id[0]:0
            var datas = await odooApi.model('crm.lead').read(data.projectId, ['material_remark', 'business_type','partner_id'])
            if (datas[0]) {
              data.loanProduct = datas[0].material_remark
              data.businessType = datas[0].business_type
              data.partner_id = datas[0].partner_id
            }
            this.data = data
            var entry = await odooApi.model('stock.return.received.line').read(this.data.actual_received_line_ids, ['id', 'product_id', 'actual_return_qty', 'qty', 'scrap_qty', 'package_qty', 'stock_return_received_loss_line_ids'])
            for (var idx in entry) {
              entry[idx].product = entry[idx].product_id
              entry[idx].returnQty = entry[idx].actual_return_qty
              var products = await odooApi.model('product.product').read(entry[idx].product_id[0], ['id', 'product_loss_ids', 'weight', 'uom_id'])
              entry[idx].weight = products[0].weight
              entry[idx].uom_id = products[0].uom_id
              entry[idx].scrapQty = entry[idx].scrap_qty
              entry[idx].overQty = entry[idx].package_qty
              var product_loss = await odooApi.model('product.loss').read(products[0].product_loss_ids, ['id', 'name', 'abbreviation'])
              var rec_loss = await odooApi.model('stock.return.received.loss.line').read(entry[idx].stock_return_received_loss_line_ids, ['id', 'product_loss_id', 'qty'])
              var lossType = []
              for (var kdx in product_loss) {
                var qty = undefined
                var matchLoss = rec_loss.filter(e => {return e.product_loss_id[0]===product_loss[kdx].id})
                if (matchLoss.length > 0) {
                  qty = matchLoss[0].qty
                }
                lossType.push({lossType: product_loss[kdx], qty: qty})
              }
              entry[idx].loss = lossType
            }
            this.entry = entry
          }
          this.actions = [{ name: '删除' }, { name: '列表' }]
        }
        var productIds = []
        this.productLoaned = {}
        /*
        var pins = await odooApi.model('stock.purchase.notice.line').searchRead([['notice_id.project_id', '=', this.data.projectId]], ['product_id', 'receive_qty'], 0, 9999)
        for (iidx in pins) {
          if (productIds.indexOf(pins[iidx].product_id[0])<0) {
            productIds.push(pins[iidx].product_id[0])
            this.productLoaned[pins[iidx].product_id[0]] = pins[iidx].receive_qty
          } else {
            this.productLoaned[pins[iidx].product_id[0]] += pins[iidx].receive_qty
          }
        }
        pins = await odooApi.model('stock.delivery.notice.line').searchRead([['parent_id.project_id', '=', this.data.projectId]], ['product_id', 'receive_qty'], 0, 9999)
        for (iidx in pins) {
          if (productIds.indexOf(pins[iidx].product_id[0])<0) {
            productIds.push(pins[iidx].product_id[0])
            this.productLoaned[pins[iidx].product_id[0]] = 0-pins[iidx].receive_qty
          } else {
            this.productLoaned[pins[iidx].product_id[0]] -= pins[iidx].receive_qty
          }
        }
        pins = await odooApi.model('stock.sublease.notice.line').searchRead([['parent_id.project_id', '=', this.data.projectId]], ['product_id', 'receive_qty'], 0, 9999)
        for (iidx in pins) {
          if (productIds.indexOf(pins[iidx].product_id[0])<0) {
            productIds.push(pins[iidx].product_id[0])
            this.productLoaned[pins[iidx].product_id[0]] = pins[iidx].receive_qty
          } else {
            this.productLoaned[pins[iidx].product_id[0]] += pins[iidx].receive_qty
          }
        }
        */
        var pins = await odooApi.model('odoo.jw.project.inventory').searchRead([['project_id', '=', this.data.projectId]], ['product_id', 'qty', 'weight'])
        for (iidx in pins) {
          productIds.push(pins[iidx].product_id[0])
          this.productLoaned[pins[iidx].product_id[0]] = pins[iidx].qty
        }
        this.productTree = [{text: '在租', children: []}]
        // this.products = await odooApi.model('product.product').searchRead([['id', 'in', productIds]], ['id', 'code_number', 'name', 'specification', 'categ_id', 'uom_id', 'product_loss_ids', 'product_tmpl_id', 'weight'], 0, productIds.length)
        this.products = await odooApi.model('product.product').searchRead([], ['id', 'code_number', 'name', 'specification', 'categ_id', 'uom_id', 'product_loss_ids', 'product_tmpl_id', 'weight', 'series'], 0, 99999999)
        for (iidx in this.products) {
          if (productIds.indexOf(this.products[iidx].id) >= 0 ) {
            this.productTree[0].children.push({id: this.products[iidx].id, text: this.products[iidx].name + '[' + this.products[iidx].specification + ']:' + this.productLoaned[this.products[iidx].id], weight: this.products[iidx].weight, loaned: this.productLoaned[this.products[iidx].id]})
          } else {
            var matchCateg = this.productTree.filter(e => { return e.text === this.products[iidx].series})
            if (matchCateg.length > 0) {
              matchCateg[0].children.push({id: this.products[iidx].id, text: this.products[iidx].name + '[' + this.products[iidx].specification + ']', weight: this.products[iidx].weight, loaned: this.productLoaned[this.products[iidx].id]})
            } else {
              this.productTree.push({text: this.products[iidx].series, children: [{id: this.products[iidx].id, text: this.products[iidx].name + '[' + this.products[iidx].specification + ']', weight: this.products[iidx].weight, loaned: this.productLoaned[this.products[iidx].id]}]})
            }
          }
          
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
        odooApi.model('transport.waybill').unlink([this.id]).then(()=>{
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
    delRec (val) {
      this.entry.forEach((item, index, arr) => {
        if (item.product[0] === val.product[0]) {
          arr.splice(index, 1)
        }
      })
    },
    showDetail (item) {
      this.loss.title = item.product[1]
      this.loss.data = item.loss
      this.loss.show = true
      console.log(item)
    },
    onConfirmStock (item) {
      // console.log('item', item)
      this.data.stockName = item.text
      this.data.stock = item.value
      this.data.addr = item.defLoc[1]
      this.showStockPicker = false
    },
    onConfirmSup (item) {
      // console.log('item', item)
      this.data.supName = item.text
      this.data.sup = item.value
      this.showSupPicker = false
    },
    onSearchSup () {
      var that = this
      odooApi.model('res.partner').searchRead([['supplier_rank', '>', 0], ['name', 'ilike', this.supSearch]], ['id', 'name']).then((sups) => {
        this.sups = []
        for (var iidx in sups) {
          that.sups.push({value: sups[iidx].id, text: sups[iidx].name})
        }
      })
    },
    async onSelProduct () {
      for(var iidx in this.selectedProduct) {
        var product = this.products.filter(e => { return e.id === this.selectedProduct[iidx] })[0]
        if (!product.loss && product.product_loss_ids) {
          var product_loss = await odooApi.model('product.loss').read(product.product_loss_ids, ['id', 'name', 'abbreviation'])
          product.loss = []
          for (var jjdx in product_loss) {
            product.loss.push({lossType: product_loss[jjdx], qty: undefined})
          }
        }
        this.entry.push({product: [product.id, product.name + '[' + product.specification + ']'], uom_id: product.uom_id, weight: product.weight, loaned: this.productLoaned[product.id], uom: product.uom_id, qty: 0, returnQty: 0, loss: product.loss})
      }
      console.log(this.selectedProduct)
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
        if(!this.data.stock) throw('请输入仓库')
        if(!this.data.sup) throw('请输入供应商')
        if(!this.data.receiver) throw('请输入签收人')
        if(!this.data.receiverPhone) throw('请输入签收人电话')
        if(this.data.weightTypeName.includes('过磅')) {
          if(!this.data.custWeight) throw('请输入客户总重')
          if(!this.data.custNet) throw('请输入客户皮重')
        }
        var rst = {
          return_date: this.data.strSendDate,
          carriage_partner_id: this.data.sup,
          project_id: this.data.projectId,
          stock_id: this.data.stock,
          location_id: 8,
          sender: this.data.senderName,
          sender_phone: this.data.senderPhone,
          receiver: this.data.receiver,
          receiver_phone: this.data.receiverPhone,
          address: this.data.addr,
          description: this.data.desc,
          weight_form_id: this.weightType,
          number_plate: this.data.carNo,
          driver: this.data.driverName,
          driver_phone: this.data.driverPhone,
          compute_weight: this.data.weight,
          total_weight: this.data.custWeight,
          tare_weight: this.data.custNet,
          net_weight: this.data.custWeight - this.data.custNet,
          material_remark: this.data.loanProduct,
          actual_received_line_ids: [],
          stock_return_received_loss_line_ids: [],
          received_line_ids: []
        }
        if (this.data.partner_id) {
          rst.partner_id = this.data.partner_id[0]
        }
        for (var idx in this.entry) {
          var entry = this.entry[idx]
          if(entry.returnQty>=0 || entry.loss.filter(e => {return e.qty && e.qty > 0}).length > 0){
            var rEntry = {
              product_id: entry.product[0],
              actual_return_qty: entry.returnQty,
              qty: entry.returnQty, // entry.qty,
              scrap_qty: entry.scrapQty,
              package_qty: entry.overQty,
              stock_return_received_loss_line_ids: []
            }
            for (var kdx in entry.loss) {
              if (entry.loss[kdx].qty) {
                rEntry.stock_return_received_loss_line_ids.push([0, false, {
                  product_id: entry.product[0],
                  product_loss_id: entry.loss[kdx].lossType.id,
                  qty: entry.loss[kdx].qty
                }])
              }
            }
            rst.actual_received_line_ids.push([0, false, rEntry])
            /*
            rst.received_line_ids.push([0, false, {
              product_id: entry.product[0],
              qty: entry.qty
            }])
            */
          }
        }
        Toast.loading({forbidClick: true, duration: 0})
        try {
          if (this.id===0) {
            this.id = await odooApi.model('stock.return.received').create(rst)
          } else {
            await odooApi.model('stock.return.received').write([this.id], rst)
          } 
          Toast.clear()
          await this.load(undefined, this.id)
          this.$router.replace('./sendrec?id=' + this.id)
          // this.$router.go(-1)
        } catch (ex) {
          Toast.clear()
          Toast.fail(ex.message || ex)
        }        
      } catch(ex) {
        Toast.fail(ex.message || ex)
      }          
    },
    async onPrint () {
      Toast.loading({forbidClick: true, duration: 0})
      try {
        var doc = new PdfPrint({pageWidth: 600, pageHeight: 872, pageLeft: 20, pageTop: 50, pageRight: 0, pageButtom: 0})
        for (var idx = 1; idx <=6; idx++) {
          if (idx > 1) {
            doc.pdf.addPage()
          }
          var page = {width: 572, height: 872, left: 20, top: 50, right: 20, buttom: 20}
          var position = {curY: page.top, curX: 150}
          
          doc.pdf.setFontSize(18)
          doc.pdf.text(position.curX, position.curY, "广东九为工程安全科技股份有限公司")
          position.curY += 20
          doc.pdf.text(position.curX, position.curY, "产品退货单（编号：" + this.data.name + ")")
          
          position.curX = page.left
          position.curY += 20
          var fontSize = 8
          doc.pdf.setFontSize(fontSize)
          await doc.printQrcode(500, 30, 550, 80 , this.data.name + '-' + idx, {lineLeft: true, lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          
          var rowHeight = fontSize + 6
          var p = doc.printText(position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "退货单位", {lineLeft: true, lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, this.data.supName || '', {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "退货人", {lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.senderName || '', {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "退货人电话", {lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, this.data.senderPhone || '', {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          
          if (this.data.businessType === 'engineer') {// 施工
            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "项目名称", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, this.data.projectName || '', {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "地址", {lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 260, p.y1, '', {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收发中转单位", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, "北京九为模架建筑工程有限公司", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "负责人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.receiver || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "联系电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, this.data.receiverPhone || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收货单位", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, "广东九为工程安全科技股份有限公司", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "负责人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.receiver || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "联系电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, this.data.receiverPhone || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收货地址", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, this.data.stockName || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "收货人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "收货人电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          } else {
            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收货单位", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 190, p.y1, "广东九为工程安全科技股份有限公司", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "签收人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.receiver || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "签收人电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, this.data.receiverPhone || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "项目名称", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 340, p.y1, this.data.projectName || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "联系电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 110, p.y1, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            // p = doc.printText(p.x1, p.y, p.x1 + 160, p.y1, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收货地址", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 340, p.y1, this.data.stockName || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 160, p.y1, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "退货日期", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.strSendDate || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 90, p.y1, "发货人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.senderName || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "合同号", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 160, p.y1, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          }
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "承运司机", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.driverName || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 90, p.y1, "车牌号", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, this.data.carNo || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "司机电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 160, p.y1, this.data.driverPhone || '', {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})

          rowHeight += 10
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "NO", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, "产品名称", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          // p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, "产品名称", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          // p = doc.printText(p.x1, p.y, p.x1 + 150, p.y1, "产品规格(mm)", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 40, p.y1, "单位", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "数量", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 310, p.y1, "备注", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})

          rowHeight -= 5
          var jdx = 0
          for (jdx in this.entry) {
            var rec = this.entry[jdx]
            var loss = rec.loss.filter(e => {return e.qty && e.qty > 0})
            var tmpRowHeight = rowHeight // * (loss.length || 1)
            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + tmpRowHeight, String(Number(jdx) + 1), {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, rec.product[1] || '', {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            // p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, rec.product[1] || '', {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            // p = doc.printText(p.x1, p.y, p.x1 + 150, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 40, p.y1, rec.uom_id ? rec.uom_id[1] : '', {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, String(rec.returnQty), {lineRight: true, lineButtom: true, right: 3, vertical: 'right', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 310, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p.y1 = p.y
            var strLoss = ''
            if (loss.length > 0) {
              for (var kdx in loss) {
                var recd = loss[kdx]
                if (recd.qty) {
                  strLoss += (recd.lossType.abbreviation || recd.lossType.name) + ':' + String(recd.qty) + ';'
                }
                // p = doc.printText(p.x, p.y1, p.x + 310, p.y1 + rowHeight, (recd.lossType.abbreviation || recd.lossType.name) + ':' + String(recd.qty), {vertical: 'left', horizontal: 'center', left: 3})
              }
            }
            if (rec.scrapQty !== '' && rec.scrapQty!=='0') {
              strLoss += '报废:' + rec.scrapQty
            }
            if (rec.overQty !== '' && rec.overQty!=='0') {
              strLoss += '翻包:' + rec.overQty
            }
            p = doc.printText(p.x, p.y1, p.x + 310, p.y1 + rowHeight, strLoss, {vertical: 'left', horizontal: 'center', left: 3})
          }
          tmpRowHeight = rowHeight
          for (jdx = this.entry.length; jdx < 20; ++jdx) {
            p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + tmpRowHeight, String(Number(jdx) + 1), {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, '', {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            // p = doc.printText(p.x1, p.y, p.x1 + 150, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 40, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 50, p.y1, "", {lineRight: true, lineButtom: true, right: 3, vertical: 'right', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 310, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p.y1 = p.y
            p = doc.printText(p.x, p.y1, p.x + 310, p.y1 + rowHeight, '', {vertical: 'left', horizontal: 'center', left: 3})
          }
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + tmpRowHeight, "备注", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 500, p.y1, this.data.desc || '', {lineRight: true, lineButtom: true, vertical: 'left', horizontal: 'center', left: 3})
          rowHeight += 20
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "退货人签字", {lineLeft: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 100, p.y1, "", {vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 150, p.y1, "审核人：", {vertical: 'center', horizontal: 'center'})
            p = doc.printText(p.x1, p.y, p.x1 + 40, p.y1, "", {lineRight: true, vertical: 'center', horizontal: 'center'})
          if (this.data.weightTypeName && this.data.weightTypeName.includes('过磅')) {
            p = doc.printText(p.x1, p.y, p.x1 + 210, p.y1, "客户过磅", {lineRight: true, right: 3, vertical: 'center', horizontal: 'center'})
          } else {
            p = doc.printText(p.x1, p.y, p.x1 + 210, p.y1, "", {lineRight: true, right: 3, vertical: 'center', horizontal: 'center'})
          }
          rowHeight += 20
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "收货人签字", {lineLeft: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 290, p.y1, "", {lineRight: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 210, p.y1, "", {lineRight: true, right: 3, vertical: 'right', horizontal: 'center'})
          if (this.data.weightTypeName && this.data.weightTypeName.includes('过磅')) {
            doc.printText(p.x, p.y, p.x + 50, p.y + 10, '总重：', {right: 3, vertical: 'right', horizontal: 'center'})
            doc.printText(p.x + 50, p.y, p.x + 150, p.y + 10, this.data.custWeight || '', {right: 3, vertical: 'left', horizontal: 'center'})
            doc.printText(p.x, p.y, p.x + 50, p.y + 30, '皮重：', {right: 3, vertical: 'right', horizontal: 'center'})
            doc.printText(p.x + 50, p.y, p.x + 150, p.y + 30, this.data.custNet || '', {right: 3, vertical: 'left', horizontal: 'center'})
            doc.printText(p.x, p.y, p.x + 50, p.y + 50, '净重：', {right: 3, vertical: 'right', horizontal: 'center'})
            doc.printText(p.x + 50, p.y, p.x + 150, p.y + 50, (this.data.custWeight || 0) - (this.data.custNet || 0), {right: 3, vertical: 'left', horizontal: 'center'})
          }
          rowHeight -= 20
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "司机签字", {lineLeft: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 290, p.y1, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 210, p.y1, "", {lineRight: true, lineButtom: true, right: 3, vertical: 'right', horizontal: 'center'})
          rowHeight -= 20
          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "备注", {vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 500, p.y1, "1、请司机带回收货人签字的收货单2联", {vertical: 'left', horizontal: 'center', left: 3})

          p = doc.printText(page.left, p.y1, page.left + 50, p.y1 + rowHeight, "", {vertical: 'center', horizontal: 'center'})
          p = doc.printText(p.x1, p.y, p.x1 + 500, p.y1, "2、01白联物资部、02粉联财务、03浅绿联物资部、04蓝联承运商、05黄联客户", {vertical: 'left', horizontal: 'center', left: 3})

          p = doc.printText(page.left, page.height - 70, page.width - 10, page.height - 50, '-' + idx + '-', {vertical: 'center', horizontal: 'center'})
          console.log(p)
        }
        /*
        var pdf = new JsPDF('', 'pt', 'a4')
        pdf.addFont('NotoSansCJKtc-Regular.ttf', 'NotoSansCJKtc', 'normal')
        pdf.setFont('NotoSansCJKtc');
        for (var idx = 1; idx <= 2; idx++) {
          if (idx > 1) {
            pdf.addPage()
          }
          var page = {width: 600, height: 1000, left: 20, top: 50, right: 20, buttom: 50}
          var position = {curY: page.top, curX: 150, nextHeight: 20, nextWidth: 0}
          
          pdf.setFontSize(18)
          pdf.text(position.curX, position.curY, "广东九为工程安全科技股份有限公司")
          position.curY += 20
          pdf.text(position.curX, position.curY, "产品退货单（编号：" + this.data.name+")")
          
          position.curX = page.left
          position.curY += 20
          var fontSize = 8
          pdf.setFontSize(fontSize)
          var rowHeight = fontSize + 6
          var p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "退货单位", {lineLeft: true, lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 240, position.curY + rowHeight, this.data.partner_id[1], {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 240, position.curY, position.curX + 290, position.curY + rowHeight, "退货人", {lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 290, position.curY, position.curX + 390, position.curY + rowHeight, "", {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 440, position.curY + rowHeight, "退货人电话", {lineTop: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 440, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineTop: true, lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "收货单位", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 240, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 240, position.curY, position.curX + 290, position.curY + rowHeight, "签收人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 290, position.curY, position.curX + 390, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 440, position.curY + rowHeight, "签收人电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 440, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "项目名称", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 240, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 240, position.curY, position.curX + 290, position.curY + rowHeight, "联系电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 290, position.curY, position.curX + 390, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "收货地址", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 390, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "退货日期", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 150, position.curY + rowHeight, this.data.strSendDate, {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 150, position.curY, position.curX + 240, position.curY + rowHeight, "发货人", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 240, position.curY, position.curX + 340, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 390, position.curY + rowHeight, "合同号", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "承运司机", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 150, position.curY + rowHeight, this.data.driverName, {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 150, position.curY, position.curX + 240, position.curY + rowHeight, "车牌号", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 240, position.curY, position.curX + 340, position.curY + rowHeight, this.data.carNo, {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 390, position.curY + rowHeight, "司机电话", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + rowHeight, this.data.driverPhone, {lineRight: true, lineButtom: true, left: 3, horizontal: 'center'})
          position.curY += rowHeight
          rowHeight += 10
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "NO", {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 150, position.curY + rowHeight, "产品名称", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 150, position.curY, position.curX + 300, position.curY + rowHeight, "产品规格(mm)", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 300, position.curY, position.curX + 340, position.curY + rowHeight, "单位", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 390, position.curY + rowHeight, "数量", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + rowHeight, "备注", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          position.curY += rowHeight
          rowHeight -= 10
          for (var jdx in this.entry) {
            var rec = this.entry[jdx]
            var loss = rec.loss.filter(e => {return e.qty && e.qty > 0})
            var tmpRowHeight = rowHeight * (loss.length || 1)
            p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + tmpRowHeight, String(Number(jdx) + 1), {lineLeft: true, lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 150, position.curY + tmpRowHeight, rec.product[1], {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = this.printText(pdf, position.curX + 150, position.curY, position.curX + 300, position.curY + tmpRowHeight, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = this.printText(pdf, position.curX + 300, position.curY, position.curX + 340, position.curY + tmpRowHeight, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 390, position.curY + tmpRowHeight, String(rec.actual_return_qty), {lineRight: true, lineButtom: true, right: 3, vertical: 'right', horizontal: 'center'})
            p = this.printText(pdf, position.curX + 390, position.curY, position.curX + 560, position.curY + tmpRowHeight, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
            for (var kdx in loss) {
              var recd = loss[kdx]
              p = this.printText(pdf, position.curX + 390, position.curY + rowHeight * kdx, position.curX + 560, position.curY + rowHeight * kdx + rowHeight, recd.lossType.name + ':' + String(recd.qty), {vertical: 'left', horizontal: 'center', left: 3})
            }
            position.curY += tmpRowHeight
          }
          rowHeight += 20
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "退货人签字", {lineLeft: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 150, position.curY + rowHeight, "", {vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 150, position.curY, position.curX + 300, position.curY + rowHeight, "审核人：", {vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 300, position.curY, position.curX + 340, position.curY + rowHeight, "", {lineRight: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, right: 3, vertical: 'right', horizontal: 'center'})
          position.curY += rowHeight
          rowHeight += 20
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "收货人签字", {lineLeft: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 340, position.curY + rowHeight, "", {lineRight: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, right: 3, vertical: 'right', horizontal: 'center'})
          position.curY += rowHeight
          rowHeight -= 20
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "司机签字", {lineLeft: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 340, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 340, position.curY, position.curX + 560, position.curY + rowHeight, "", {lineRight: true, lineButtom: true, right: 3, vertical: 'right', horizontal: 'center'})
          position.curY += rowHeight
          rowHeight -= 20
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "备注", {vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 560, position.curY + rowHeight, "1、请司机带回收货人签字的收货单2联", {vertical: 'left', horizontal: 'center', left: 3})
          position.curY += rowHeight
          p = this.printText(pdf, position.curX, position.curY, position.curX + 50, position.curY + rowHeight, "", {vertical: 'center', horizontal: 'center'})
          p = this.printText(pdf, position.curX + 50, position.curY, position.curX + 560, position.curY + rowHeight, "2、01白联物资部、02粉联财务、03浅绿联物资部、04蓝联承运商、05黄联客户", {vertical: 'left', horizontal: 'center', left: 3})
          position.curY += rowHeight
          console.log(p)
        }
        */
        // this.pdfUri = pdf.output('datauristring')
        doc.pdf.save(this.title + '.pdf')
        Toast.clear()
      } catch (ex) {
        Toast.clear()
        Toast.fail(ex.message || ex)
      }
    }
  }
}
</script>

<style>
.send-rec .van-popup--center {
  width: 90%;
}
.van-tree-select__item {
  padding:0px 0
}
.van-tabs__line {
  z-index: 0
}
</style>