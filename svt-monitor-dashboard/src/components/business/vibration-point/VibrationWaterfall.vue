<template>
    <div class="card-item waterfall-card">
        <div class="card-header">
            <div class="card-title app-section-title">频域瀑布图</div>
            <div class="time-section">
                <div class="interval-input">
                    <span class="interval-label">间隔</span>
                    <el-input-number v-model="intervalHours" :min="0.25" :max="24" :step="0.25" :precision="2"
                        size="small" placeholder="小时" controls-position="right" class="interval-num" />
                    <span class="interval-unit">小时</span>
                </div>
                <CommonDateTimePicker v-model="dateRange" width="320px" />
            </div>
        </div>
        <div ref="waterfallChartRef" class="chart-container"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch, inject, computed } from 'vue';
import type { Ref } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl';
import { useChartResize } from '@/composables/useChart';
import { getLast24HoursRange } from '@/utils/datetime';
import CommonDateTimePicker from '@/components/common/ui/CommonDateTimePicker.vue';

const waterfallChartRef = ref<HTMLElement>();
const waterfallChartInstance = shallowRef<echarts.ECharts | null>(null);

// 灰色主题下图表坐标轴/字体用黑色，否则白色（与设备详情页一致）
const backgroundMode = inject<Ref<'image' | 'gray' | 'green' | 'navy'> | undefined>('backgroundMode');
const isGrayTheme = computed(() => backgroundMode?.value === 'gray');
const chartAxisColor = computed(() => (isGrayTheme.value ? '#000' : '#ffffff'));
// 3D 平面网格线：非灰色主题保持灰色，灰色主题为黑色
const chartGridLineColor = computed(() => (isGrayTheme.value ? '#000' : '#999999'));

// 间隔时间（小时），默认 1
const intervalHours = ref(1);

// 时间选择器
const dateRange = ref<[string, string] | null>(null);

/** 根据时间范围和间隔生成 y 轴时间点；条数 = floor((结束-开始)/间隔) */
function generateTimesFromRange(
    startStr: string,
    endStr: string,
    intervalHoursVal: number
): string[] {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const stepMs = intervalHoursVal * 60 * 60 * 1000;
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0 || stepMs <= 0) {
        const d = new Date(startStr);
        return [`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`];
    }
    const count = Math.max(1, Math.floor(durationMs / stepMs));
    const times: string[] = [];
    const sameDay = start.toDateString() === end.toDateString();
    for (let i = 0; i < count; i++) {
        const t = start.getTime() + i * stepMs;
        const d = new Date(t);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        times.push(sameDay ? `${h}:${m}:${s}` : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${h}:${m}`);
    }
    return times.reverse(); // 时间最新的在最前面
}

const initChart = () => {
    if (!waterfallChartRef.value) return;

    if (!waterfallChartInstance.value) {
        waterfallChartInstance.value = echarts.init(waterfallChartRef.value);
    }

    // 根据时间范围和间隔生成 y 轴时间点
    const [startStr, endStr] = dateRange.value && dateRange.value[0] && dateRange.value[1]
        ? dateRange.value
        : getLast24HoursRange();
    const times = generateTimesFromRange(startStr, endStr, intervalHours.value);

    // x轴：频率 0-100000Hz
    const frequencies = Array.from({ length: 100 }, (_, i) => i * 1000);

    // 颜色渐变：从黄到绿
    const light = { r: 255, g: 215, b: 0 };   // 黄色
    const dark = { r: 34, g: 139, b: 34 };    // 绿色
    const generateGradientColors = (count: number) => {
        return Array.from({ length: count }, (_, i) => {
            const t = count > 1 ? i / (count - 1) : 1;
            const r = Math.round(light.r + (dark.r - light.r) * t);
            const g = Math.round(light.g + (dark.g - light.g) * t);
            const b = Math.round(light.b + (dark.b - light.b) * t);
            return `rgb(${r},${g},${b})`;
        });
    };
    const curveColors = generateGradientColors(times.length);

    // 按时间切片拆分为多条曲线，每条曲线一个 series
    const seriesList = times.map((time, timeIndex) => {
        const points = frequencies.map(freq => {
            const baseAcceleration = 0.5 + Math.sin(freq / 10000) * 0.3;
            const noise = (Math.random() - 0.5) * 0.2;
            const acceleration = Math.max(0, baseAcceleration + noise);
            return [freq, timeIndex, acceleration, `${(acceleration || 0).toFixed(3)} m/s²`];
        });
        return {
            name: time,
            type: 'line3D' as const,
            data: points,
            lineStyle: {
                width: 2,
                color: curveColors[timeIndex % curveColors.length]
            },
            label: { show: false },
            emphasis: {
                label: {
                    show: true,
                    formatter: (params: any) => `${(params.value[2] || 0).toFixed(3)} m/s²`,
                    fontSize: 12,
                    color: '#ffffff'
                }
            }
        };
    });

    const c = chartAxisColor.value;
    const gridColor = chartGridLineColor.value;
    waterfallChartInstance.value.setOption({
        tooltip: {
            show: true,
            trigger: 'item',
            className: 'echarts-tooltip',
            backgroundColor: 'rgba(50, 50, 50, 0.9)',
            borderColor: 'rgba(50, 50, 50, 0.9)',
            textStyle: { color: '#fff' },
            formatter: (params: any) => {
                const freq = params.value?.[0] ?? 0;
                const seriesName = params.seriesName || '';
                const value = params.value?.[2] ?? 0;
                const timeLabel = seriesName || (typeof params.value?.[1] === 'number'
                    ? times[params.value[1]] ?? ''
                    : '');

                return [
                    `时间：${timeLabel}`,
                    `频率：${freq.toFixed(0)} Hz`,
                    `速度有效值：${value.toFixed(3)} mm/s`
                ].join('<br/>');
            }
        },
        grid3D: {
            // 调整3D盒子位置，为右侧图例留出空间
            left: '-10%',
            top: '-2%',
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
            axisPointer: {
                lineStyle: { color: '#063c83' }
            },
            splitLine: {
                lineStyle: { color: gridColor }
            },
            splitArea: {
                show: true,
                areaStyle: {
                    color: '#F0f0f0',
                    opacity: 1
                }
            }
        },
        xAxis3D: {
            type: 'value',
            name: '频率(Hz)',
            nameTextStyle: {
                color: c,
                fontSize: 12,
            },
            nameGap: 40,
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            axisLabel: {
                color: c,
                fontSize: 12,
                margin: 10
            },
            min: 0,
            max: 100000
        },
        yAxis3D: {
            type: 'category',
            name: '时间',
            nameTextStyle: {
                color: c,
                fontSize: 12,
            },
            nameGap: 5,
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            axisLabel: {
                color: c,
                fontSize: 12,
                margin: 20
            },
            data: times
        },
        legend: {
            show: true,
            data: times,
            textStyle: { color: c },
            pageTextStyle: { color: c },
            pageIconColor: '#ffffff',
            pageIconInactiveColor: 'rgba(255,255,255,0.5)',
            right: 10,
            top: 'middle',
            orient: 'vertical',
            type: 'scroll'
        },
        zAxis3D: {
            name: '速度有效值(mm/s)',
            nameTextStyle: {
                color: c,
                fontSize: 12,
            },
            nameGap: 5,
            namemoveoverlap: true,
            axisLine: { lineStyle: { color: c } },
            axisTick: { lineStyle: { color: c } },
            axisLabel: {
                color: c,
                fontSize: 12,
                margin: 5
            }
        },
        series: seriesList
    }, { replaceMerge: ['series'] });
};



const { bindResize } = useChartResize(waterfallChartInstance, waterfallChartRef);

onMounted(() => {
    if (!dateRange.value || !dateRange.value[0]) {
        dateRange.value = getLast24HoursRange();
    }
    initChart();
    bindResize();
});

watch([dateRange, intervalHours], () => {
    if (waterfallChartInstance.value) initChart();
}, { deep: true });

watch(() => backgroundMode?.value, () => {
    if (waterfallChartInstance.value) initChart();
}, { flush: 'post' });

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
        padding: 10px 20px 0 20px;

        .card-title {
            color: #fff;
        }

        .time-section {
            width: 320px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;

            .interval-input {
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 6px;

                .interval-label {
                    color: #fff;
                }

                .interval-num {
                    width: 100px;
                }

                .interval-unit {
                    color: rgba(255, 255, 255, 0.8);
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