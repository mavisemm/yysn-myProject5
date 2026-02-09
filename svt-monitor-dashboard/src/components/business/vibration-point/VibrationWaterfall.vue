<template>
    <div class="card-item waterfall-card">
        <div class="card-header">
            <div class="card-title app-section-title">频域瀑布图</div>
            <div class="time-section">
                <el-date-picker v-model="dateRange" type="datetimerange" range-separator="-" start-placeholder="开始日期"
                    end-placeholder="结束日期" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" size="small"
                    style="width: 320px;" class="time-search-input" popper-class="custom-datepicker-popper"
                    :default-time="defaultTime" :disabled-date="disabledDate" :locale="zhCn" />
            </div>
        </div>
        <div ref="waterfallChartRef" class="chart-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, computed, watch } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl'; // 引入3D图表支持
import { ElDatePicker } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { useChartResize } from '@/composables/useChart';
import { handleDatePickerChange, disabledFutureDate } from '@/utils/datetime';

const waterfallChartRef = ref<HTMLElement>();
const waterfallChartInstance = shallowRef<echarts.ECharts | null>(null);

// 时间选择器相关数据
const dateRange = ref<[string, string]>(['', '']);
const disabledDate = disabledFutureDate;

const defaultTime = computed(() => {
    const now = new Date();
    return [new Date(2000, 1, 1, 0, 0, 0), now] as [Date, Date];
});

// 监听日期范围变化，自动处理结束时间逻辑
watch(dateRange, (newVal) => {
    // 处理空值情况 - 如果清空了选择，保持空状态
    if (!newVal || newVal.length !== 2 || !newVal[0] || !newVal[1]) {
        // 保持空状态，不进行任何处理
        return;
    }

    // 将字符串转换为Date对象进行处理
    const startDate = new Date(newVal[0]);
    const endDate = new Date(newVal[1]);

    const result = handleDatePickerChange([startDate, endDate]);
    if (result) {
        // 只有当处理后的结果与当前值不同时才更新，避免无限循环
        if (result[0] !== newVal[0] || result[1] !== newVal[1]) {
            dateRange.value = result;
        }
    } else if (result === null && (newVal[0] || newVal[1])) {
        // 如果处理结果为null但原值不为空，说明用户清空了选择
        dateRange.value = ['', ''];
    }
}, { deep: true });



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
                nameGap: 40,
                axisLine: {
                    lineStyle: {
                        color: '#ffffff' // 白色坐标轴线
                    }
                },
                axisLabel: {
                    color: '#ffffff', // 白色标签
                    fontSize: 12, // 标签字体大小
                    margin: 10 // 标签与轴线的距离
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
                    margin: 20 // 标签与轴线的距离
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
                show: false, // 隐藏图例筛选颜色
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
            //font-weight: bold;
            color: #fff;
        }

        .time-section {
            .time-search-input {
                :deep(.el-input__wrapper) {
                    // background: url('@/assets/images/background/首页-搜索框背景.png') no-repeat center center;
                    // background-size: 100% 100%;
                    border-radius: 4px;
                    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
                    border: none;

                    .el-input__inner {
                        color: white;
                        background: transparent;
                    }

                    .el-input__prefix {
                        color: white;
                    }
                }
            }
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
<style lang="scss">
.custom-datepicker-popper {
    .el-date-range-picker {
        // background: url('@/assets/images/background/首页-预警总览背景.png') no-repeat center center;
        // background-size: 100% 100%;
        // border: 1px solid rgba(150, 150, 150, 0.2);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

        .el-picker-panel__body {
            // padding: 12px;

            .el-date-editor {
                width: 100% !important;

                :deep(.el-input__wrapper) {
                    height: 26px !important;
                    padding: 0 6px !important;
                    background: rgba(150, 150, 150, 0.1) !important;
                    border: 1px solid rgba(150, 150, 150, 0.2) !important;
                    box-shadow: none !important;
                    border-radius: 3px !important;
                }

                :deep(.el-input__inner) {
                    height: 26px !important;
                    line-height: 26px !important;
                    font-size: 11px !important;
                    padding: 0 4px !important;
                    color: white !important;
                    background: transparent !important;
                }
            }
        }

        .el-date-range-picker__header {
            font-size: 12px !important;
            font-weight: normal !important;
            padding: 4px 0 !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .el-picker-panel__icon-btn {
            width: 14px !important;
            height: 14px !important;
            line-height: 14px !important;
            font-size: 11px !important;
        }

        .el-date-range-picker__content {
            width: 180px !important;
            padding: 6px !important;

            .el-date-table {
                font-size: 10.5px !important;

                th,
                td {
                    padding: 2px 0 !important;
                    height: 22px !important;
                    line-height: 22px !important;
                }
            }
        }

        .el-time-panel {
            padding: 6px !important;

            .el-time-spinner__wrapper {
                padding: 0 3px !important;
            }

            .el-time-spinner__input {
                :deep(.el-input__inner) {
                    height: 22px !important;
                    line-height: 22px !important;
                    font-size: 11px !important;
                    padding: 0 3px !important;
                }
            }
        }

        .el-picker-panel__footer {
            padding: 6px 10px !important;

            .el-button--text {
                font-size: 11px !important;
                padding: 2px 6px !important;
            }
        }
    }
}
</style>