# 未使用冗余代码检查报告

## 1. 样式 / SCSS

### variables.scss（全部未使用）
- `common.scss` 通过 `@use './variables.scss'` 引入，但**未引用任何变量**
- 以下变量均未被使用：
  - `$primary-color`, `$success-color`, `$warning-color`, `$danger-color`, `$info-color`
  - `$card-blue`, `$card-red`, `$card-green`, `$card-yellow`
  - `$sidebar-width`, `$header-height`
  - `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`, `$spacing-xl`
  - `$border-radius`, `$border-color`

### custom-colors.scss
- `.special-font-color`：**已使用**（ChartsAnalysisModule、ThreeMetrics、PointListModule）
- `.element-ui-safe`：**未使用**（仅定义，无引用）

---

## 2. 组件

### 完全未使用
| 文件 | 说明 |
|------|------|
| `components/common/ui/BaseChart.vue` | 无任何组件引用 |
| `components/common/ui/Search.vue` | 无任何组件引用 |
| `components/common/ui/Pagination.vue` | 无任何组件引用 |
| `components/common/ui/Loading.vue` | 无任何组件引用 |
| `components/common/ui/Card.vue` | 无任何组件引用 |
| `components/icons/IconTooling.vue` | 无引用 |
| `components/icons/IconSupport.vue` | 无引用 |
| `components/icons/IconEcosystem.vue` | 无引用 |
| `components/icons/IconDocumentation.vue` | 无引用 |
| `components/icons/IconCommunity.vue` | 无引用 |

### 备份文件（可删除）
| 文件 | 说明 |
|------|------|
| `components/business/vibration-point/VibrationWaterfall_backup.vue` | 备份文件，未在路由或任何地方引用 |

### 示例文件（未接入路由）
| 文件 | 说明 |
|------|------|
| `examples/ApiUsageExample.vue` | 示例组件，未在路由中注册，仅用于开发参考 |

---

## 3. API 模块

### 通过 api/index 导出但未被业务使用
| 模块 | 说明 |
|------|------|
| `api/modules/event.ts` | 导出 `eventApi`，无业务代码引用 |
| `api/modules/zyservice.ts` | 导出 `zyServiceApi`，无业务代码引用 |
| `api/modules/deviceLatest.ts` | 导出 `deviceLatestApi`，无业务代码引用 |

**说明**：业务代码均直接从 `@/api/modules/xxx` 引入具体函数，`api/index.ts` 的聚合导出仅被 `ApiUsageExample.vue` 使用。

---

## 4. 建议操作

### 可安全删除
1. **variables.scss**：删除整个文件，并移除 `common.scss` 中的 `@use './variables.scss'`
2. **custom-colors.scss**：删除 `.element-ui-safe` 类及其变量 `$element-ui-safe-color`
3. **VibrationWaterfall_backup.vue**：删除备份文件
4. **BaseChart.vue、Search.vue、Pagination.vue、Loading.vue、Card.vue**：若确认未来不用，可删除
5. **components/icons/** 下 5 个 Icon 组件：Vue 模板默认文件，可删除
6. **examples/ApiUsageExample.vue**：若不需要示例，可删除

### 需确认后处理
- **event.ts、zyservice.ts、deviceLatest.ts**：若为预留接口，可保留；否则可从 `api/index.ts` 移除导出并考虑删除模块文件
