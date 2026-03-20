<template>
    <div class="login-page">
        <div class="login-container">
            <!-- 左侧标题区域 -->
            <div class="left-title">
                <h1 class="main-title">鲁西化工声振温</h1>
                <h2 class="sub-title">综合在线监测平台</h2>
            </div>

            <!-- 右侧登录区域 -->
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
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login as loginApi } from '@/api/modules/login'

// 引入路由
const router = useRouter()

// 表单数据
const loginForm = reactive({
    userName: '',
    password: ''
})

// 表单验证规则
const loginRules = {
    userName: [
        { required: true, message: '请输入用户名', trigger: 'blur' }
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
    ]
}

// 表单引用
const loginFormRef = ref<InstanceType<typeof ElForm>>()

// 加载状态
const loading = ref(false)

// 处理登录
const handleLogin = async () => {
    if (!loginFormRef.value) return

    // 验证表单
    const valid = await loginFormRef.value.validate().catch(() => false)
    if (!valid) return

    // 设置加载状态
    loading.value = true

    try {
        // 先清理旧登录态，避免“上一次残留 tenantId”污染本次会话
        localStorage.removeItem('token')
        localStorage.removeItem('tenantId')

        // 调用实际后端登录接口（8003）
        const res = await loginApi({
            userName: loginForm.userName,
            password: loginForm.password
        })

        // 兼容两种返回结构：
        // - 新结构：{ rc: 0, ret: '<tenantId>', err: null }
        // - 旧结构（src0 项目）：{ result: 0, data: { tenantId, ... }, msg }
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

        // 新结构（示例）：
        // - { rc: 0, ret: { tenantId: 'xxx', token: 'yyy' }, err: null }
        // - 或 { rc: 0, ret: 'xxx', token: 'yyy', err: null }
        const token =
            normalizeToken((res as any)?.token) ||
            normalizeToken((res as any)?.ret?.token) ||
            normalizeToken((res as any)?.data?.token) ||
            normalizeToken((res as any)?.ret?.accessToken) ||
            normalizeToken((res as any)?.data?.accessToken)

        // 旧结构兼容：旧版可能是 ret = '<tenantId>'（string）
        // 新结构：ret 可能是对象，此时不能直接把整个对象当 tenantId 存入 localStorage
        const tenantId =
            normalizeTenantId((res as any)?.data?.tenantId) ||
            (typeof (res as any)?.ret === 'string' ? normalizeTenantId((res as any)?.ret) : '') ||
            normalizeTenantId((res as any)?.ret) ||
            normalizeTenantId((res as any)?.ret?.tenantId)

        // 登录成功标记：路由守卫依赖 localStorage.token 判断是否已登录
        // 同时 request 拦截器会把它拼到 Authorization: Bearer <token>
        if (!token) {
            throw new Error('登录成功但未返回 token')
        }
        localStorage.setItem('token', token)

        // 登录成功必须写入 tenantId（供业务接口使用）
        if (!tenantId) {
            throw new Error('登录成功但未返回 tenantId')
        }
        localStorage.setItem('tenantId', tenantId)

        // 显示成功消息
        ElMessage.success('登录成功')

        // 跳转到首页
        router.push('/')
    } catch (error) {
        console.error('登录错误:', error)
        ElMessage.error('登录失败，请重试')
    } finally {
        loading.value = false
    }
}

// 注意：在实际生产环境中，密码应通过HTTPS传输
// 并在后端进行哈希处理，前端不应存储或记录密码明文
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
        height: 600px; // 固定高度
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
                            /* Element Plus placeholder 变量兜底 */
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

                    /* 直接命中 el-input 内部输入框 placeholder，防止被全局样式覆盖 */
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

// 响应式设计
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