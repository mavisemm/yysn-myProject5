<template>
    <div class="login-page">
        <div class="login-container">
            <!-- 左侧标题区域 -->
            <div class="left-title">
                <h1 class="main-title">云音声脑</h1>
                <h2 class="sub-title">声振温在线监测平台</h2>
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
        // 调用登录API
        // 在实际部署时，这里会真正调用后端API
        // 目前使用静态验证模拟API响应
        const response = {
            rc: (loginForm.userName === 'admin' && loginForm.password === '123456') ? 0 : 1,
            ret: (loginForm.userName === 'admin' && loginForm.password === '123456') ? 'mock-token-' + Date.now() : null,
            err: (loginForm.userName === 'admin' && loginForm.password === '123456') ? '' : '用户名或密码错误'
        }

        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 800))

        if (response.rc === 0 && response.ret) {
            // 登录成功，保存token
            localStorage.setItem('token', response.ret)

            // 显示成功消息
            ElMessage.success('登录成功')

            // 跳转到首页
            router.push('/')
        } else {
            // 登录失败
            throw new Error(response.err || '登录失败')
        }
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
    background: url('@/assets/images/background/登录页背景.png') no-repeat center center;
    background-size: cover;
    display: flex;
    justify-content: center;
    align-items: center;

    .login-container {
        width: 100%;
        max-width: 1200px; // 增加最大宽度以适应左右布局
        height: 600px; // 固定高度
        display: flex;
        padding: 0 20px;

        .left-title {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            gap: 30px;

            .main-title {
                color: #00ffff;
                font-weight: 500;
                font-size: 55px;
                margin: 0 0 20px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            }

            .sub-title {
                color: #00ffff;
                font-size: 50px;
                font-weight: 500;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            }
        }

        .right-login {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;

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
                    font-size: 25px;
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

                            input {
                                color: white;

                                &::placeholder {
                                    color: rgba(255, 255, 255, 0.6);
                                }
                            }

                            .el-input__prefix-inner .el-icon {
                                color: rgba(255, 255, 255, 0.8);
                            }
                        }
                    }

                    :deep(.el-button) {
                        width: 100%;
                        height: 48px;
                        font-size: 16px;
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

                .main-title {
                    font-size: 36px;
                }

                .sub-title {
                    font-size: 24px;
                }
            }

            .right-login {
                width: 100%;
            }
        }
    }
}
</style>