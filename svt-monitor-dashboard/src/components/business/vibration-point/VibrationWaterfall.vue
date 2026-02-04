<template>
    <div class="card-item waterfall-card">
        <div class="card-header">
            <div class="card-title">频域瀑布图</div>
            <el-button type="primary" size="small">筛选数据</el-button>
        </div>
        <div ref="waterfallChartRef" class="chart-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl'; // 引入3D图表支持
import { ElButton } from 'element-plus';
import { useChartResize } from '@/composables/useChart';

const waterfallChartRef = ref<HTMLElement>();
const waterfallChartInstance = shallowRef<echarts.ECharts | null>(null);



const initChart = () => {
    if (waterfallChartRef.value) {
        waterfallChartInstance.value = echarts.init(waterfallChartRef.value);

        // 模拟数据：频率-时间-加速度有效值
        const mockData: any[] = [];
        // x轴：频率 0-100000Hz
        const frequencies = Array.from({ length: 100 }, (_, i) => i * 1000); // 0-100000Hz，间隔1000Hz
        // y轴：连续十天
        const startDate = new Date();
        const times = Array.from({ length: 10 }, (_, i) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
        }).reverse(); // 按时间顺序排列

        times.forEach((time, timeIndex) => {
            frequencies.forEach(freq => {
                // 生成加速度有效值数据，模拟真实测量值
                const baseAcceleration = 0.5 + Math.sin(freq / 10000) * 0.3; // 基础值
                const noise = (Math.random() - 0.5) * 0.2; // 随机噪声
                const acceleration = Math.max(0, baseAcceleration + noise); // 确保非负
                mockData.push([freq, time, acceleration, `${(acceleration || 0).toFixed(3)} m/s²`, timeIndex]);
            });
        });

        waterfallChartInstance.value.setOption({
            grid3D: {
                viewControl: {
                    projection: 'orthographic',
                    alpha: 15, // 垂直角度
                    beta: 20,  // 水平角度
                    distance: 250, // 视距
                    rotateSensitivity: 1, // 旋转灵敏度
                    zoomSensitivity: 0.5, // 缩放灵敏度
                    panSensitivity: 1 // 平移灵敏度
                },
                // 3D盒子尺寸
                boxWidth: 100,
                boxHeight: 100,
                boxDepth: 100,
                // 添加网格线颜色设置
                axisPointer: {
                    lineStyle: {
                        color: '#ffffff' // 白色cross线
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#ffffff' // 白色网格线
                    }
                }
            },
            xAxis3D: {
                type: 'value',
                name: '频率(Hz)',
                nameTextStyle: {
                    color: '#ffffff', // 白色字体
                    fontSize: 12, // 字体大小
                },
                nameGap: 20,
                axisLine: {
                    lineStyle: {
                        color: '#ffffff' // 白色坐标轴线
                    }
                },
                axisLabel: {
                    color: '#ffffff', // 白色标签
                    fontSize: 12, // 标签字体大小
                    margin: 5 // 标签与轴线的距离
                },
                min: 0,
                max: 100000
            },
            yAxis3D: {
                type: 'category',
                name: '时间',
                nameTextStyle: {
                    color: '#ffffff', // 白色字体
                    fontSize: 12, // 字体大小
                },
                nameGap: 5,
                axisLine: {
                    lineStyle: {
                        color: '#ffffff' // 白色坐标轴线
                    }
                },
                axisLabel: {
                    color: '#ffffff', // 白色标签
                    fontSize: 12, // 标签字体大小
                    margin: 17 // 标签与轴线的距离
                },
                data: times
            },
            zAxis3D: {
                name: '加速度有效值(m/s²)',
                nameTextStyle: {
                    color: '#ffffff', // 白色字体
                    fontSize: 12, // 字体大小

                },
                nameGap: 5,
                namemoveoverlap: true,
                axisLine: {
                    lineStyle: {
                        color: '#ffffff' // 白色坐标轴线
                    }
                },
                axisLabel: {
                    color: '#ffffff', // 白色标签
                    fontSize: 12, // 标签字体大小
                    margin: 5 // 标签与轴线的距离
                }
            },
            visualMap: {
                show: true,
                type: 'continuous', // 连续型图例
                orient: 'vertical', // 垂直方向
                right: 20, // 右侧边距
                top: 'middle', // 垂直居中
                calculable: true, // 可拖拽计算
                realtime: true, // 实时更新
                textStyle: {
                    color: '#ffffff' // 白色文字
                },
                handleStyle: {
                    color: '#ffffff', // 拖拽手柄白色
                    borderColor: '#ffffff'
                },
                borderColor: '#ffffff',
                borderWidth: 1,
                max: 1.0,
                dimension: 2,
                inRange: {
                    // 改为暖色调配色，避免蓝色背景冲突
                    color: ['#ff6b35', '#f7931e', '#ffd23f', '#a3de83', '#2ec4b6', '#6a67ce', '#c19a6b', '#ff7bac', '#ff9aa2', '#ffb7b2', '#ffdac1']
                }
            },
            dataset: {
                dimensions: [
                    'Frequency',
                    'Time',
                    'Acceleration',
                    'Tooltip',
                    { name: 'TimeIndex', type: 'ordinal' }
                ],
                source: mockData
            },
            series: [
                {
                    type: 'line3D',
                    lineStyle: {
                        width: 2,
                        color: '#ffffff' // 白色线条，避免蓝色背景干扰
                    },
                    label: {
                        show: false
                    },
                    emphasis: {
                        label: {
                            show: true,
                            formatter: (params: any) => `${(params.value[2] || 0).toFixed(3)} m/s²`,
                            fontSize: 12,
                            color: '#ffffff'
                        }
                    },
                    encode: {
                        x: 'Frequency',
                        y: 'TimeIndex',
                        z: 'Acceleration',
                        tooltip: [0, 1, 2, 3]
                    }
                }
            ]
        });
    }
};



const { bindResize } = useChartResize(waterfallChartInstance, waterfallChartRef);

onMounted(() => {
    initChart();
    bindResize();
});

onUnmounted(() => {
    waterfallChartInstance.value?.dispose();
});
</script>

<style lang="scss" scoped>
.card-item {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;

        .card-title {
            font-size: clamp(16px, 1.5vw, 20px);
            font-weight: bold;
            color: #fff;
        }
    }

    .chart-container {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 20px;
    }
}

.waterfall-card {
    width: 66.66%;
    background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
    background-size: 100% 100%;
}
</style>