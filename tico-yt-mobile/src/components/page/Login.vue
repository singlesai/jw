<template>
<div>
    <van-nav-bar title="登录"></van-nav-bar>
    <van-form @submit="onSubmit">
    <van-cell-group inset>
        <van-field v-model="username" name="用户名" label="用户名" placeholder="用户名" :rules="[{ required: true, message: '请填写用户名' }]" />
        <van-field v-model="password" type="password" name="密码" label="密码" placeholder="密码" :rules="[{ required: true, message: '请填写密码' }]" />
    </van-cell-group>
    <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit">  提交 </van-button>
    </div>
    </van-form>
</div>
</template>

<script>
import odooApi from '@/srv'
import { setLocalStorage } from '@/utils/local-storage'
import { Toast } from 'vant'

export default {
  name: 'pLogin',
  data () {
    return {
      username: '',
      password: ''
    }
  },
  methods: {
    async onSubmit () {
      try {
        var auth = odooApi.session
        var loginRst = await auth.authenticate(this.username, this.password)
        loginRst.isSup = false
        loginRst.isCust = false
        var ids = []
        ids.push(loginRst.partner_id)
        while(ids.length>0)
        {
            var partners = await odooApi.model('res.partner').read(ids, ['parent_id','company_id', 'is_company', 'customer_rank', 'supplier_rank'])
            console.log('partner', partners)
            ids = []
            for (var idx in partners) {
                var partner = partners[idx]
                if (partner.customer_rank>0) {
                    loginRst.isCust = true
                }
                if (partner.supplier_rank>0) {
                    loginRst.isSup = true
                }
                if (partner.parent_id) {
                    ids.push(partner.parent_id[0])
                }
            }
        }
        setLocalStorage({user: JSON.stringify(loginRst)})
        if(loginRst.isCust && !loginRst.isSup) {
        this.$router.push({name: 'PurOrd'})
            return
        }
        if(loginRst.isSup && !loginRst.isCust) {
        this.$router.push({name: 'PurOrd'})
            return
        }
        this.$router.push({name: 'PurOrd'})
      } catch (ex) {
        Toast.fail(ex.message || ex)
      }
    }
  }
}
</script>