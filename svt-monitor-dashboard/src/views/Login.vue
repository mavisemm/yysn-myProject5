<template>
    <div class="login-page">
        <div class="login-container">
            <div class="left-title">
                <h1 class="main-title">鲁西化工声振温</h1>
                <h2 class="sub-title">综合在线监测平台</h2>
            </div>

            <div class="right-login">
                <div class="login-card">
                    <div class="login-subtitle">欢迎登录</div>

                    <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form">
                        <el-form-item prop="userName">
                            <el-input v-model="loginForm.userName" placeholder="请输入用户名" size="large"
                                :prefix-icon="User" />
                        </el-form-item>

                        <el-form-item prop="password">
                            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large"
                                :prefix-icon="Lock" show-password />
                        </el-form-item>

                        <el-button type="primary" size="large" class="login-button" @click="handleLogin"
                            :loading="loading">
                            登录
                        </el-button>
                    </el-form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login as loginApi } from '@/api/modules/login'
import { useAlarmBatchStore } from '@/stores/alarmBatch'
import { useAlarmOverviewStore } from '@/stores/alarmOverview'
import { useDeviceTreeStore } from '@/stores/deviceTree'


const router = useRouter()


onMounted(() => {
    localStorage.clear()
    
    useAlarmBatchStore().resetPrefetchState()
    useAlarmOverviewStore().reset()
    
    useDeviceTreeStore().clearDeviceTreeData()
})


const loginForm = reactive({
    userName: '',
    password: ''
})


const loginRules = {
    userName: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
    ]
}


const loginFormRef = ref<InstanceType<typeof ElForm>>()


const loading = ref(false)


const handleLogin = async () => {
    if (!loginFormRef.value) return

    
    const valid = await loginFormRef.value.validate().catch(() => false)
    if (!valid) return

    
    loading.value = true

    try {
        
        localStorage.removeItem('token')
        localStorage.removeItem('tenantId')

        
        const res = await loginApi({
            userName: loginForm.userName,
            password: loginForm.password
        })

        const isOk =
            (res && typeof res === 'object' && 'rc' in res && (res as any).rc === 0) ||
            (res && typeof res === 'object' && 'result' in res && (res as any).result === 0)

        if (!isOk) {
            const err = (res as any)?.err || (res as any)?.msg || '登录失败'
            throw new Error(err)
        }

        const normalizeToken = (val: unknown): string => {
            if (val === null || val === undefined) return ''
            if (typeof val === 'string') return val.trim()
            if (typeof val === 'number') return String(val)
            if (typeof val === 'object') {
                const obj = val as Record<string, any>
                return normalizeToken(obj.token ?? obj.accessToken ?? obj.jwt ?? obj.value)
            }
            return ''
        }

        const normalizeTenantId = (val: unknown): string => {
            if (val === null || val === undefined) return ''
            if (typeof val === 'string') return val.trim()
            if (typeof val === 'number') return String(val)
            if (typeof val === 'object') {
                const obj = val as Record<string, any>
                return normalizeTenantId(obj.tenantId ?? obj.tenant_id ?? obj.id ?? obj.value)
            }
            return ''
        }

        
        
        
        const token =
            normalizeToken((res as any)?.token) ||
            normalizeToken((res as any)?.ret?.token) ||
            normalizeToken((res as any)?.data?.token) ||
            normalizeToken((res as any)?.ret?.accessToken) ||
            normalizeToken((res as any)?.data?.accessToken)

        const tenantId =
            normalizeTenantId((res as any)?.data?.tenantId) ||
            (typeof (res as any)?.ret === 'string' ? normalizeTenantId((res as any)?.ret) : '') ||
            normalizeTenantId((res as any)?.ret) ||
            normalizeTenantId((res as any)?.ret?.tenantId)

        if (!token) {
            throw new Error('登录成功但未返回 token')
        }
        localStorage.setItem('token', token)

        if (!tenantId) {
            throw new Error('登录成功但未返回 tenantId')
        }
        localStorage.setItem('tenantId', tenantId)

        
        await router.push({ name: 'Dashboard', query: { tenantId } })

        ElMessage.success('登录成功')
    } catch (error) {
        console.error('登录错误:', error)
        ElMessage.error('登录失败，请重试')
    } finally {
        loading.value = false
    }
}



</script>

<style scoped lang="scss">
.login-page {
    width: 100vw;
    height: 100vh;
    background: url('@/assets/images/background/登录页背景.jpg') no-repeat center center;
    background-size: cover;
    display: flex;
    justify-content: center;
    align-items: center;

    .login-container {
        width: 100%;
        height: 600px;
        display: flex;
        justify-content: space-between;
        padding: 0 10vw;

        .left-title {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            gap: 30px;

            .main-title {
                font-size: 4rem;
                color: #00ffff;
                font-weight: 500;
                margin: 0 0 20px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .sub-title {
                font-size: 3rem;
                color: #00ffff;
                font-weight: 500;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }

        .right-login {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;

            .login-card {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                padding: 40px 30px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.18);
                width: 100%;
                max-width: 400px;

                .login-subtitle {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 30px;
                    text-align: center;
                }

                .login-form {
                    width: 100%;

                    :deep(.el-input) {
                        margin-bottom: 20px;

                        .el-input__wrapper {
                            background: rgba(150, 150, 150, 0.2);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            backdrop-filter: blur(5px);
                            
                            --el-text-color-placeholder: #fff;

                            input {
                                color: white !important;

                                &::placeholder {
                                    color: #fff !important;
                                }
                            }

                            .el-input__prefix-inner .el-icon {
                                color: rgba(255, 255, 255, 0.8);
                            }
                        }
                    }

                    
                    :deep(.el-input__inner::placeholder) {
                        color: #fff !important;
                        opacity: 1;
                    }

                    :deep(.el-button) {
                        width: 100%;
                        height: 48px;
                        font-weight: 500;
                        letter-spacing: 1px;
                    }
                }
            }
        }
    }
}

@media (max-width: 768px) {
    .login-page {
        .login-container {
            flex-direction: column;
            height: auto;
            padding: 20px;

            .left-title {
                padding-right: 0;
                align-items: center;
                margin-bottom: 30px;
            }

            .right-login {
                width: 100%;
            }
        }
    }
}
</style>