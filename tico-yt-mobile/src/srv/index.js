import Odoo from './odoo'

export default new Odoo({
  db:  'JWERP',//'JW20221209-test',//'JW220919-test', // process.env.ODOO_DB,
  // host: 'localhost',
  // host: '192.168.1.36',
  // port: '81',
  path: ''
  // port: '81'
})
