import odoo from './odoo/index'
import * as localStore from '../utils'

var authenticate = (account, password) =>
  odoo.session.authenticate(account, password).then((data) => {
    if (data) {
      return odoo.model('res.users').read(data.uid, ['id', 'name']).then((data) => {
        return data
      })
    }
  })

var logout = () =>
  odoo.session.destroy().then(() => {
  })

var getUser = () =>
  odoo.session.getSessionInfo().then((data) => {
    if (data) {
      return odoo.model('res.users').read(data.uid, ['id', 'name', 'agency_partner_id']).then((data) => {
        if (data.agency_partner_id) {
          var user = data
          return odoo.model('res.partner').read(data.agency_partner_id[0], ['id', 'name']).then((data) => {
            user.partner = data
            return user
          })
        } else {
          return data
        }
      })
    }
  })

var getPartner = (uid) =>
  odoo.model('res.users').read(uid, ['agency_partner_id']).then((data) => {
    if (data.agency_partner_id) {
      odoo.model('res.partner').read(data.agency_partner_id, ['id', 'name']).then((data) => {
        return data
      })
    } else {
      return null
    }
  })

var productCategory = (filter) =>
  odoo.model('product.webcateg').searchRead([], ['id', 'name', 'child_id']).then((data) => {
    return data
  })

var productTemplateList = function (categId, filter, page, cpp, ref) {
  var domain = [['can_sale_qty', '>', 0], ['sale_price', '>', 0]]
  if (filter) domain.push(['name', 'like', filter])
  if (categId) domain.push('|', ['web_categ', '=', categId], ['web_categ', 'child_of', categId])
  odoo.model('product.template').searchRead(domain, ['web_categ', 'id', 'name', 'description', 'image_mall_small', 'can_sale_qty'], (page - 1) * cpp, cpp).then((data) => {
    for (var i = 0; i < data.length; ++i) {
      var rec = data[i]
      if (rec.image_mall_small) rec.image_url = rec.image_mall_small && localStore.base64Src(rec.image_mall_small)
    }
    ref(data)
  })
}

var addToPurCar = function (ordEntry) {
  var purOrd = JSON.parse(localStore.getStore('purCar'))
  if (purOrd === null) purOrd = []
  console.log(purOrd)
  purOrd.push(ordEntry)
  localStore.setStore('purCar', purOrd)
}

var removeFromPurCar = function (ordEntry) {
  var purOrd = JSON.parse(localStore.getStore('purCar'))
  if (purOrd === null) purOrd = []
  purOrd.remove(ordEntry)
  localStore.setStore('purCar', purOrd)
}

var clearPurCar = function () {
  localStore.setStore('purCar', null)
}

var getPurCar = () => {
  var purOrd = JSON.parse(localStore.getStore('purCar'))
  if (purOrd === null) purOrd = []
  var templateIds = []
  var productIds = []
  for (var i = 0; i < purOrd.length; ++i) {
    var rec = purOrd[i]
    if (rec.templateId) templateIds.push(rec.templateId)
    if (rec.productId) productIds.push(rec.productId)
  }
  /*
  odoo.model('product.template').read(templateIds, ['id', 'name', 'image_small']).then((data) => {
    for (var i = 0; i < data.length; ++i) {
      for (var j = 0; j < purOrd.length; ++j) {
        if (purOrd[j].templateId === data[i].id) purOrd[j].product = data[i]
      }
    }
  })
  */
  return odoo.model('product.product').read(productIds, ['id', 'name', 'description', 'image_mall_small', 'uom_id', 'sale_price']).then((data) => {
    for (var i = 0; i < data.length; ++i) {
      for (var j = 0; j < purOrd.length; ++j) {
        if (purOrd[j].productId === data[i].id) purOrd[j].product = data[i]
      }
    }
    return purOrd
  })
  // return purOrd
}

var toSaleOrder = function (ord) {
  var rst = {}
  var lines = []
  for (var i = 0; i < ord.lines.length; ++i) {
    var line = [0, false, { 'product_id': ord.lines[i].productId, 'product_uom': ord.lines[i].product.uom_id[0], 'price_unit': 1, 'product_uom_qty': ord.lines[i].qty }]
    lines.push(line)
  }
  rst.partner_id = ord.partner_id
  rst.order_line = lines
  return odoo.model('sale.order').create(rst).then((data) => {
    return data
  })
}

var getSaleOrder = function (filter, pageSize, page) {
  return odoo.model('sale.order').searchRead([], ['date_order', 'name', 'partner_id', 'create_uid', 'order_line']).then((data) => {
    var lineIds = []
    for (var i = 0; i < data.length; ++i) {
      lineIds = lineIds.concat(data[i].order_line)
    }
    return odoo.model('sale.order.line').read(lineIds, ['order_id', 'product_id', 'product_id.image_mall_small', 'product_uom_qty', 'price_unit']).then((lines) => {
      var productIds = []
      for (var i = 0; i < lines.length; ++i) {
        var line = lines[i]
        if (line.product_id) {
          productIds.push(line.product_id[0])
        }
        for (var j = 0; j < data.length; ++j) {
          if (data[j].id === line.order_id[0]) {
            if (!data[j].lines) data[j].lines = []
            data[j].lines.push(line)
            break
          }
        }
      }
      return odoo.model('product.product').read(productIds, ['image_mall_small', 'name', 'description', 'sale_price']).then((products) => {
        for (var k = 0; k < products.length; ++k) {
          for (var i = 0; i < data.length; ++i) {
            for (var j = 0; j < data[i].lines.length; ++j) {
              if (data[i].lines[j].product_id[0] === products[k].id) {
                data[i].lines[j].product = {'image_mall_small': products[k].image_mall_small}
              }
            }
          }
        }
        return data
      })
    })
  })
}

var addToSaleCar = function (ordEntry) {
  var saleOrd = JSON.parse(localStore.getStore('saleCar'))
  if (saleOrd === null) saleOrd = []
  saleOrd.push(ordEntry)
  localStore.setStore('saleCar', saleOrd)
}

var removeFromSaleCar = function (ordEntry) {
  var saleOrd = JSON.parse(localStore.getStore('saleCar'))
  if (saleOrd === null) saleOrd = []
  saleOrd.remove(ordEntry)
  localStore.setStore('saleCar', saleOrd)
}

var clearSaleCar = function () {
  localStore.setStore('saleCar', null)
}

var getSaleCar = function () {
  var saleOrd = JSON.parse(localStore.getStore('saleCar'))
  if (saleOrd === null) saleOrd = []
  var templateIds = []
  var productIds = []
  for (var i = 0; i < saleOrd.length; ++i) {
    var rec = saleOrd[i]
    if (rec.templateId) templateIds.push(rec.templateId)
    if (rec.productId) productIds.push(rec.productId)
  }
  odoo.model('product.template').read(templateIds, ['id', 'name', 'image_mall_small']).then((data) => {
    for (var i = 0; i < data.length; ++i) {
      for (var j = 0; j < saleOrd.length; ++j) {
        if (saleOrd[j].templateId === data[i].id) saleOrd[j].product = data[i]
      }
    }
  })
  odoo.model('product.product').read(productIds, ['id', 'name', 'description', 'image_mall_small', 'sale_price']).then((data) => {
    for (var i = 0; i < data.length; ++i) {
      for (var j = 0; j < saleOrd.length; ++j) {
        if (saleOrd[j].id === data[i].id) saleOrd[j].product = data[i]
      }
    }
  })
  return saleOrd
}

var productTemplate = (id) =>
  odoo.model('product.template').read([id], ['id', 'name', 'image_mall_small', 'image_mall_medium']).then((data) => {
    var pt = data[0]
    pt.ps = []
    return odoo.model('product.product').searchRead(['&', ['product_tmpl_id', '=', id], ['can_sale_qty', '>', 0]], ['attribute_value_ids', 'id', 'name', 'default_code', 'description', 'can_sale_qty', 'sale_price']).then((data) => {
      var avIds = []
      for (let i = 0; i < data.length; i++) {
        var p = {}
        p.id = data[i].id
        p.name = data[i].name
        p.number = data[i].default_code
        p.description = data[i].description
        p.model = data[i].description
        p.qty = data[i].can_sale_qty
        p.price = data[i].sale_price
        pt.ps.push(p)
        avIds = avIds.concat(data[i].attribute_value_ids)
      }
      return odoo.model('product.attribute.value').read(avIds, ['id', 'name', 'attribute_id']).then((data) => {
        pt.attrs = []
        for (let j = 0; j < data.length; j++) {
          let attr = {}
          attr.id = data[j].attribute_id[0]
          attr.name = data[j].attribute_id[1]
          attr.vals = []
          let atr
          let val = {}
          val.id = data[j].id
          val.name = data[j].name
          for (let k = 0; k < pt.attrs.length; k++) {
            if (pt.attrs[k].id === attr.id) {
              atr = pt.attrs[k]
              pt.attrs[k].vals.push(val)
              break
            }
          }
          if (atr == null) {
            atr = attr
            attr.vals.push(val)
            pt.attrs.push(atr)
          }
        }
        return pt
      })
    })
    // return pt
  })

export {
  authenticate,
  logout,
  getUser,
  getPartner,
  productCategory,
  productTemplateList,
  productTemplate,
  addToPurCar,
  removeFromPurCar,
  clearPurCar,
  getPurCar,
  addToSaleCar,
  removeFromSaleCar,
  clearSaleCar,
  getSaleCar,
  toSaleOrder,
  getSaleOrder
}
