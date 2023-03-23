const express = require('express')
var proxy = require('express-http-proxy')
var path = require('path')
const cfg = require('@/../../config.json')

var app = express()
app.set('view engine', 'ejs')

app.use('/main', express.static(path.join(__dirname, 'dist')))
app.use('/test', proxy('http://localhost:8080'))
// app.use('/', proxy('test.odoo.7fx.cn/'))
app.use('/', proxy('http://test.jwerp.7fx.cn'))
//app.use('/', proxy('http://erp.gdgowe.com'))
//http://erp.gdgowe.com/web
module.exports = app