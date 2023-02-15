import axios from 'axios'
import dateFormat from 'dateformat'

class odoo {
  /**
   * https://www.odoo.com/documentation/9.0/api_integration.html
   * @param opts {...} {db, host, port, protocol}
   */
  constructor (opts) {
    var location = window.document.location
    console.log('host', window.document.location)
    // this.opts = opts
    this.session_id = ''
    this.context = ''
    this.db = opts.db
    this.sid = ''
    this.host = (opts && opts.host) || location.hostname || ''
    this.port = (opts && opts.port && `:${opts.port}`) || `:${location.port}` || ''
    this.protocol = (opts && opts.protocol) || 'http'
    this.urlPath = (opts && opts.path) || ''
    this.api_root = `${this.protocol}://${this.host}${this.port}${this.urlPath}`

    // For all available apis, browse the odoo addons source code:
    // PATH: %ODOO_PROJECT_ROOT%/addons/web/controller/main.py
    this.paths = {
      authenticate: `${this.api_root}/web/session/authenticate`,
      get_session_info: `${this.api_root}/web/session/get_session_info`,
      databases: `${this.api_root}/web/database/get_list`,
      dataset_call_kw: `${this.api_root}/web/dataset/call_kw`
    }
  }

  /**
   * For all available apis, browse the odoo addons source code:
   * PATH: %ODOO_PROJECT_ROOT%/addons/web/controller/main.py
   * @param url
   * @returns {string}
   */
  path (url) {
    return `${this.api_root}/web/${url}`
  }

  rpc (path = this.paths.dataset_call_kw, method = 'call', params = {}) {
    return axios.post(path, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1e9),
      method,
      params
    }, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/javascript, */*'
      }
    }).then((res) => {
      // console.log(res);vm.notify(res.data.error.message)
      if (res.data.error) {
        return Promise.reject(res.data.error)
      }
      return res.data.result
    })
  }

  callKw (model, method, args = [false, 'tree', this.context, true], kwargs = {}) {
    const params = { model, method, args, kwargs }
    // return this.rpc(this.paths.dataset_call_kw, 'call', params)
    // 打个补丁，修正时区
    return this.rpc(this.paths.dataset_call_kw, 'call', params).then(data => {
      const gao = item => {
        if (!item) return item
        if (item instanceof Function) return item
        if (item instanceof Array) {
          item.forEach(d => {
            gao(d)
          })
          return item
        } else if (item instanceof Object) {
          for (const k of Object.keys(item)) {
            var v = item[k]
            // v.replace(/-/g, '/')
            if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(v)) {
              // console.log('v', v)
              v = v.replace(/-/g, '/')
              item[k] = dateFormat(new Date(`${v} GMT`), 'yyyy/mm/dd HH:MM:ss')
            } else {
              gao(v)
            }
          }
          return item
        }
        return item
      }
      return gao(data)
    })
  }

  /**
   * Webclient API accessor
   */
  get webclient () {
    const odoo = this
    return {
      cssList (mods = null) {
        return odoo.rpc(odoo.path('webclient/csslist'), 'call', { mods })
      },
      jsList (mods = null) {
        return odoo.rpc(odoo.path('webclient/jslist'), 'call', { mods })
      },
      bootstrapTranslations (mods = []) {
        return odoo.rpc(odoo.path('webclient/bootstrap_translations'), 'call', { mods })
      },
      translations (mods = null, lang = null) {
        return odoo.rpc(odoo.path('webclient/translations'), 'call', { mods, lang })
      },
      versionInfo () {
        return odoo.rpc(odoo.path('webclient/version_info'), 'call', {})
      }
    }
  }

  /**
   * Proxy API accessor
   */
  get proxy () {
    const odoo = this
    return {
      /**
       * Proxies an HTTP request through a JSON request.
       * It is strongly recommended to not request binary files through this,
       * as the result will be a binary data blob as well.
       * @param path {string} actual request path
       * @returns {*} file content
       */
      load (path) {
        return odoo.rpc(odoo.path('proxy/load'), 'call', { path })
      }
    }
  }

  /**
   * Session API accessor
   * @returns {*}
   */
  get session () {
    const odoo = this
    return {
      authenticate (login, password) {
        return odoo.rpc(
          odoo.path('session/authenticate'),
          'call',
          { db: odoo.db, login, password }
        ).then((data) => {
          odoo.session_id = data.session_id
          odoo.context = data.user_context
          return data
        })
      },

      changePassword (oldPwd, newPwd, confirmPwd) {
        return odoo.rpc(odoo.path('session/change_password'), 'call', {
          fields: [
            { name: 'old_pwd', value: oldPwd },
            { name: 'new_password', value: newPwd },
            { name: 'confirm_pwd', value: confirmPwd }
          ]
        }).then(data => {
          if (data.error) return Promise.reject(data.error)
          return true
        })
      },

      destroy () {
        return odoo.rpc(odoo.path('session/destroy'), 'call', {})
      },

      check () {
        return odoo.rpc(odoo.path('session/check'), 'call', {})
      },

      getLangList () {
        return odoo.rpc(odoo.path('session/get_lang_list'), 'call', {})
      },

      /**
       * return all installed modules. Web client is smart enough to not load a module twice
       */
      modules () {
        return odoo.rpc(odoo.path('session/modules'), 'call', {})
      },

      /**
       * This method store an action object in the session object and returns an integer
       * identifying that action. The method get_session_action() can be used to get
       * back the action.
       * @param {*} theAction The action to save in the session.
       * @returns {*} key: A key identifying the saved action.
       */
      saveSessionAction (theAction) {
        return odoo.rpc(odoo.path('session/save_session_action'), 'call', {
          the_action: theAction
        })
      },

      /**
       * Gets back a previously saved action. This method can return None if the action
       * was saved since too much time (this case should be handled in a smart way).
       * @param key Integer
       * @returns {*}
       */
      getSessionAction (key) {
        return odoo.rpc(odoo.path('session/get_session_action'), 'call', { key })
      },

      getSessionInfo () {
        return odoo.rpc(odoo.path('session/get_session_info'), 'call', {}).then((data) => {
          this.session_id = data.session_id
          this.context = data.user_context
          return data
        })
      }
    }
  }

  /**
   * 产生一个 model 的操作器，传入 model 的 id，提供一系列的操作方法
   * @param model string ODOO model 的 ID 字符串
   * @returns {*}
   */
  model (model) {
    const odoo = this
    return {
      call (method, args = [], kwargs = {}) {
        return odoo.callKw(model, method, args, kwargs)
      },
      checkAccessRights () {
        return odoo.callKw(model, 'check_access_rights', ['read'], { raise_exception: false })
      },
      search (domain = [], offset = 0, limit = 10, order = null) {
        return odoo.callKw(model, 'search', [domain, offset, limit, order])
      },
      searchCount (domain = []) {
        return odoo.callKw(model, 'search_count', [domain])
      },
      read (ids = [], fields = null) {
        return odoo.callKw(model, 'read', [ids], fields ? { fields } : {})
        // return odoo.callKw(model, 'read', [[ids], fields], {context: {bin_size: true, lang: 'zh_CN', tz: false, uid: 2, allowed_company_ids: [1]}})
      },
      readGroup (domain = [], fields = [], groupby = [], offset = 0, limit = null) {
        return odoo.callKw(model, 'read_group', [domain, fields, groupby, offset, limit])
      },
      nameGet (ids = []) {
        return odoo.callKw(model, 'name_get', [ids])
      },
      fieldsGet (attributes = null) {
        return odoo.callKw(
          model, 'fields_get', [],
          attributes ? { attributes } : { attributes: ['string', 'help', 'type'] }
        )
      },
      searchRead (domain = [], fields = null, offset = 0, limit = 10, order = null) {
        const kwargs = { offset, limit, order }
        if (fields) kwargs.fields = fields
        return odoo.callKw(model, 'search_read', [domain], kwargs)
      },
      create (values) {
        return odoo.callKw(model, 'create', [values])
      },
      write (ids = [], values) {
        return odoo.callKw(model, 'write', [ids, values])
      },
      unlink (ids = []) {
        return odoo.callKw(model, 'unlink', [ids])
      }
    }
  }

  /**
   * https://www.odoo.com/documentation/9.0/api_integration.html#ir-model
   * @param name
   * @param model
   * @param state
   * @param fieldId
   * @param viewIds
   * @param accessIds
   */
  createModel (name, model, state = 'manual', fieldId = [], viewIds = [], accessIds = []) {
    return this.model('ir.model').create({
      name,
      model,
      state,
      field_id: fieldId,
      view_ids: viewIds,
      access_ids: accessIds
    })
  }

  /**
   * https://www.odoo.com/documentation/9.0/api_integration.html#ir-model-fields
   * @param modelId
   * @param name
   * @param fieldDescription
   * @param ttype
   * @param state
   * @param required
   * @param readonly
   * @param translate
   * @param groups
   * @param selection
   * @param size
   * @param onDelete
   * @param relation
   * @param relationField
   * @param domain
   */
  createModelFields (modelId, name, fieldDescription = '', ttype = 'char', state = 'manual',
                    required = true, readonly = false, translate = true, groups = [],
                    selection, size, onDelete, relation, relationField, domain = []) {
    return this.model('ir.model.fields').create({
      model_id: modelId,
      field_description: fieldDescription,
      name,
      ttype,
      state,
      required,
      readonly,
      translate,
      groups,
      selection,
      size,
      onDelete,
      relation,
      relationField,
      domain
    })
  }

  /**
   * TODO: Workflow manipulations
   * https://www.odoo.com/documentation/9.0/api_integration.html#workflow-manipulations
   */
  executeWorkflow () {
  }

  /**
   * TODO: Report printing
   * https://www.odoo.com/documentation/9.0/api_integration.html#report-printing
   */
  renderReport () {
  }
}

export default odoo
