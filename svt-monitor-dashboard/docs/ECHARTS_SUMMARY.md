# 项目中 ECharts 使用总结

## 一、使用位置汇总

| 文件 | 图表类型 | 说明 |
|------|----------|------|
| `VibrationChartComparison.vue` | 振动频域图、振动时域图 | 折线图 + 面积 + dataZoom slider，支持倍频 tooltip |
| `VibrationWaterfall.vue` | 频域瀑布图 | 3D 折线图（echarts-gl），时间 × 频率 × 加速度 |
| `ChartsAnalysisModule.vue` | 温度/响度/烈度折线图、趋势分析 dB/密度图 | 多个 2D 折线图，弹窗内联动 |
| `SoundPointCharts.vue` | 能量曲线、密度曲线 | 多系列折线，图表联动 + 滚轮缩放 |
| `SoundPoint.vue` | 弹窗能量/密度图 | 弹窗内双图表，dataZoom/tooltip 联动 |
| `DeviceInfoModule.vue` | 声音/振动健康度仪表盘 | Gauge 仪表盘，A/B/C/D 等级 |

## 二、共同模式

- **初始化**：`echarts.init(el)`
- **主题**：通过 `inject('backgroundMode')` 控制灰色/非灰，坐标轴颜色 `#000` / `#fff`
- **Tooltip**：统一使用 `className: 'echarts-tooltip'`
- **响应式**：`useChartResize` 或 `observeResize` 监听容器尺寸
- **销毁**：`chart.dispose()` 在 `onUnmounted` 中调用

## 三、公共能力复用

- `@/utils/chart`：`connectCharts`、`observeResize`、`enableMouseWheelZoom` 等
- `@/composables/useChart`：`useChartResize`、`useChartTheme`
- `@/components/common/chart/CommonEcharts`：封装好的 ECharts 组件

## 四、CommonEcharts 公共组件

### 路径
`@/components/common/chart/CommonEcharts.vue` 或 `@/components/common/chart`

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `option` | `EChartsOption \| null` | `{}` | ECharts 配置，支持响应式 |
| `loading` | `boolean` | `false` | 显示加载中 |
| `empty` | `boolean` | `false` | 显示空数据 |
| `emptyText` | `string` | `'暂无数据'` | 空数据提示文字 |
| `useGl` | `boolean` | `false` | 是否加载 echarts-gl（3D） |
| `notMerge` | `boolean` | `false` | setOption 不合并 |
| `replaceMerge` | `string[]` | `[]` | setOption 替换合并项，如 `['series']` |
| `enableDataZoom` | `boolean` | `true` | 是否自动注入默认 dataZoom |
| `linkageGroup` | `string` | `''` | 缩放联动分组 ID，相同分组的图表可以联动缩放 |
| `enableLinkageZoom` | `boolean` | `false` | 是否开启缩放联动（默认关闭，需要手动开启） |
| `enableWheelZoom` | `boolean` | `false` | 是否开启鼠标滚轮缩放（基于 dataZoom） |
| `tooltipFollowMouse` | `boolean` | `false` | Tooltip 是否跟随鼠标并自动避免溢出视口 |
| `transparentBackground` | `boolean` | `true` | 是否在未设置 backgroundColor 时强制使用透明背景 |

### 事件

- `chart-ready(instance)`：图表初始化完成
- `chart-disposed`：图表已销毁

### 暴露方法

- `chartInstance`：图表实例
- `initChart()`：重新初始化
- `updateOption()`：手动刷新配置
- `getThemeColors()`：获取当前主题颜色

### 使用示例

```vue
<template>
  <CommonEcharts
    ref="chartRef"
    :option="chartOption"
    :empty="!data.length"
    @chart-ready="onChartReady"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CommonEcharts } from '@/components/common/chart';
import { useChartTheme } from '@/composables/useChart';

const chartRef = ref<InstanceType<typeof CommonEcharts>>();
const data = ref<number[]>([]);

const { chartAxisColor, chartSplitLineColor } = useChartTheme();

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['a','b','c'], axisLine: { lineStyle: { color: chartAxisColor.value } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: chartSplitLineColor.value } } },
  series: [{ type: 'line', data: data.value }]
}));

const onChartReady = (instance: echarts.ECharts) => {
  // 可选：connectCharts、enableMouseWheelZoom 等
};
</script>
```

### 常用能力开关示例

- **滚轮缩放**（基于 dataZoom）：

```vue
<CommonEcharts
  :option="chartOption"
  :enable-wheel-zoom="true"
/>
```

- **Tooltip 跟随鼠标并防溢出**：

```vue
<CommonEcharts
  :option="chartOption"
  :tooltip-follow-mouse="true"
/>
```

### 两个图表联动缩放示例

当两个（或多个）图表需要联动缩放时，只需要：

- 为它们指定相同的 `linkageGroup` 字符串
- 将 `enableLinkageZoom` 设为 `true`

```vue
<template>
  <div class="two-charts">
    <!-- 图表 A -->
    <CommonEcharts
      :option="optionA"
      linkage-group="vibration-link"
      :enable-linkage-zoom="true"
    />

    <!-- 图表 B -->
    <CommonEcharts
      :option="optionB"
      linkage-group="vibration-link"
      :enable-linkage-zoom="true"
    />
  </div>
</template>
```

### 3D 图表（echarts-gl）

```vue
<CommonEcharts :option="waterfallOption" use-gl />
```
