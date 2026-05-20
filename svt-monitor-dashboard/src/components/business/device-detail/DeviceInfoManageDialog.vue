<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="80vw" class="device-info-dlg device-info-dlg--main"
    :close-on-click-modal="false" destroy-on-close append-to-body @closed="reset">
    <div class="layout">
      <aside class="cat">
        <ul class="cat-list">
          <li v-for="c in categories" :key="c.id" :class="{ on: c.id === activeId }" @click="nav(c.id)">
            <el-checkbox v-if="L === 'del' && !c.isDefault" :model-value="delIds.includes(c.id)" @click.stop
              @update:model-value="(v: boolean) => toggleDel(c.id, v)">
              <span class="cat-txt">{{ c.name }}</span>
            </el-checkbox>
            <template v-else-if="L === 'del' && c.isDefault">
              <el-icon class="lock">
                <Lock />
              </el-icon>
              <span class="cat-txt">{{ c.name }}</span>
            </template>
            <el-input v-else-if="L === 'edit' && !c.isDefault" v-model="editNames[c.id]" size="small" @click.stop />
            <span v-else class="cat-txt">{{ c.name }}</span>
          </li>
          <li v-if="L === 'view' && addingCat" class="cat-inline-add-wrap" @click.stop>
            <div class="cat-inline-add">
              <el-input v-model="nameCat" size="small" placeholder="新类别名称，例如：报警信息" @keyup.enter="saveCat" />
            </div>
          </li>
        </ul>
        <div class="foot">
          <div class="foot-label">类别功能：</div>
          <template v-if="addingCat && L === 'view'">
            <el-button size="small" type="primary" :loading="saving" @click="saveCat">确定</el-button>
            <el-button size="small" @click="cancelAddCat">取消</el-button>
          </template>
          <template v-else-if="L === 'view'">
            <el-button size="small" type="success" @click="openCat">新增</el-button>
            <el-button size="small" type="danger" @click="enterDelCat">删除</el-button>
            <el-button size="small" type="warning" @click="startEditCat">编辑</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="primary" :loading="saving" @click="confirmL">确定</el-button>
            <el-button size="small" @click="cancelL">取消</el-button>
          </template>
        </div>
      </aside>

      <section class="main">
        <div ref="scrollEl" class="scroll">
          <section v-for="s in sections" :key="s.cat.id" :id="secId(s.cat.id)" class="sec">
            <h4 class="sec-h">{{ s.cat.name }}</h4>
            <p v-if="!s.rows.length && !(R === 'view' && infoAddMode)" class="empty">该类别下暂无信息</p>
            <div v-if="s.rows.length || (R === 'view' && infoAddMode)" class="grid">
              <div v-for="r in s.rows" :key="r.k" class="row" :class="{ chk: R === 'del' || R === 'edit' }">
                <el-checkbox v-if="R === 'del' || R === 'edit'" :model-value="chk.has(r.k)" :disabled="r.sys"
                  @update:model-value="(v: boolean) => toggleChk(r.k, v)" />
                <div class="card" :class="{ ed: R === 'edit', sys: r.sys }">
                  <template v-if="R === 'edit'">
                    <template v-if="r.sys">
                      <span class="lb">{{ r.lb }}</span>
                      <el-input v-model="getDraft(r.k).v" size="small" class="inp" />
                    </template>
                    <template v-else>
                      <el-input v-model="getDraft(r.k).lb" size="small" class="inp lb-inp" placeholder="名称" />
                      <el-input v-model="getDraft(r.k).v" size="small" class="inp" placeholder="值" />
                    </template>
                  </template>
                  <template v-else>
                    <span class="lb">{{ r.lb }}</span>
                    <span class="val">{{ r.val }}</span>
                  </template>
                </div>
              </div>
              <div v-if="R === 'view' && infoAddMode" class="row row--add">
                <button type="button" class="add-plus" :class="{ on: addingFieldCatId === s.cat.id }" title="在此类别添加信息"
                  @click="onClickFieldPlus(s.cat.id)">
                  +
                </button>
              </div>
            </div>
            <div v-if="R === 'view' && infoAddMode && addingFieldCatId === s.cat.id" class="field-inline-add">
              <el-input v-model="nf.lb" size="small" class="inp" placeholder="名称" />
              <el-input v-model="nf.v" size="small" class="inp" placeholder="值" />
              <div class="field-inline-add__btns">
                <el-button size="small" type="primary" :loading="saving" @click="saveFieldInline">确定</el-button>
                <el-button size="small" @click="cancelFieldInline">取消</el-button>
              </div>
            </div>
          </section>
        </div>

        <div v-if="R === 'edit'" class="mv">
          <span>移动到</span>
          <el-select v-model="mvTo" size="small" class="sel" popper-class="device-info-popper" placeholder="选择类别">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>

        <div class="foot">
          <div class="foot-label">信息功能：</div>
          <template v-if="infoAddMode && R === 'view'">
            <el-button size="small" type="primary" @click="exitInfoAddMode">确定</el-button>
            <el-button size="small" @click="exitInfoAddMode">取消</el-button>
          </template>
          <template v-else-if="R === 'view'">
            <el-button size="small" type="success" @click="toggleInfoAddMode">新增</el-button>
            <el-button size="small" type="danger" @click="enterDelField">删除</el-button>
            <el-button size="small" type="warning" @click="startEditField">编辑</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="primary" :loading="saving" @click="confirmR">确定</el-button>
            <el-button size="small" @click="cancelR">取消</el-button>
          </template>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import {
  DEFAULT_CATEGORY_ID,
  DEFAULT_CATEGORY_NAME,
  SYSTEM_FIELDS,
  type CustomDeviceField,
  type InfoCategory,
  type SystemFieldKey,
  loadTenantCategories,
  saveTenantCategories,
  uid,
  buildDeviceNewInfoPayload,
  stripUiVerifySeedFields,
} from './deviceInfoMeta'
import { editEquipmentInfo, type DeviceInfoDto } from '@/api/modules/hardware'

type LMode = 'view' | 'del' | 'edit'
type RMode = 'view' | 'del' | 'edit'

type Row = { k: string; lb: string; val: string; sys: boolean; fk?: SystemFieldKey; cid?: string }

const props = defineProps<{
  modelValue: boolean
  deviceId: string
  equipmentName: string
  deviceInfo: {
    id: number
    equipmentName: string
    deviceModel: string
    deviceFactory: string
    locationDetail: string
    pressure: number
    rotationSpeed: number
    designFlow: number
    onlineStatus: number
  }
  customFields: CustomDeviceField[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogTitle = computed(() => `设备信息管理 — ${props.equipmentName?.trim() || props.deviceId}`)

const categories = ref<InfoCategory[]>([])
const fields = ref<CustomDeviceField[]>([])
const sys = reactive<Record<SystemFieldKey, string>>({
  equipmentName: '',
  deviceModel: '',
  deviceFactory: '',
  locationDetail: '',
  pressure: '',
  rotationSpeed: '',
  designFlow: '',
})

const activeId = ref(DEFAULT_CATEGORY_ID)
const scrollEl = ref<HTMLElement | null>(null)
const L = ref<LMode>('view')
const R = ref<RMode>('view')
const saving = ref(false)
const delIds = ref<string[]>([])
const editNames = ref<Record<string, string>>({})
const addingCat = ref(false)
const nameCat = ref('')
const infoAddMode = ref(false)
const addingFieldCatId = ref<string | null>(null)
const nf = ref({ lb: '', v: '' })
const chk = ref(new Set<string>())
const draft = ref<Record<string, { lb: string; v: string }>>({})
const mvTo = ref(DEFAULT_CATEGORY_ID)

let io: IntersectionObserver | null = null

const secId = (id: string) => `dic-${id}`

const fmt = (fk: SystemFieldKey, raw: string) => {
  const x = raw.trim()
  if (!x) return '—'
  if (fk === 'rotationSpeed') return `${x} rpm`
  if (fk === 'designFlow') return `${x} m³/h`
  if (fk === 'pressure') return `${x} MPa`
  return x
}

function rowsFor(catId: string): Row[] {
  const out: Row[] = []
  if (catId === DEFAULT_CATEGORY_ID) {
    for (const [fk, lb] of SYSTEM_FIELDS) {
      out.push({ k: `s:${fk}`, lb, val: fmt(fk, sys[fk]), sys: true, fk })
    }
  }
  for (const f of fields.value) {
    if (f.categoryId !== catId) continue
    out.push({ k: `c:${f.id}`, lb: f.label, val: f.value || '—', sys: false, cid: f.id })
  }
  return out
}

const sections = computed(() => categories.value.map((cat) => ({ cat, rows: rowsFor(cat.id) })))

const flatRows = computed(() => sections.value.flatMap((s) => s.rows))

function sync() {
  categories.value = loadTenantCategories()
  fields.value = props.customFields.map((f) => ({ ...f }))
  const d = props.deviceInfo
    ; (Object.keys(sys) as SystemFieldKey[]).forEach((k) => {
      sys[k] = String((d as any)[k] ?? '')
    })
  if (!categories.value.some((c) => c.id === activeId.value)) activeId.value = DEFAULT_CATEGORY_ID
}

function bindIo() {
  io?.disconnect()
  const root = scrollEl.value
  if (!root) return
  io = new IntersectionObserver(
    (ents) => {
      if (L.value !== 'view' || R.value !== 'view') return
      const top = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        ?.target as HTMLElement | undefined
      if (top?.id?.startsWith('dic-')) activeId.value = top.id.slice(4)
    },
    { root, rootMargin: '-8% 0px -72% 0px', threshold: [0, 0.25, 0.5] },
  )
  categories.value.forEach((c) => document.getElementById(secId(c.id)) && io!.observe(document.getElementById(secId(c.id))!))
}

function nav(id: string) {
  if (L.value === 'view' && R.value === 'view') {
    activeId.value = id
    nextTick(() => document.getElementById(secId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
}

function toggleDel(id: string, on: boolean) {
  if (on) delIds.value = [...delIds.value, id]
  else delIds.value = delIds.value.filter((x) => x !== id)
}

function toggleChk(k: string, on: boolean) {
  const s = new Set(chk.value)
  on ? s.add(k) : s.delete(k)
  chk.value = s
}

function getDraft(k: string) {
  if (!draft.value[k]) draft.value[k] = { lb: '', v: '' }
  return draft.value[k]
}

function exitInfoAddMode() {
  infoAddMode.value = false
  addingFieldCatId.value = null
  nf.value = { lb: '', v: '' }
}

watch(visible, async (o) => {
  if (o) {
    sync()
    reset()
    await nextTick()
    bindIo()
  } else {
    io?.disconnect()
    io = null
  }
})

watch(
  () => props.customFields,
  () => visible.value && sync(),
  { deep: true },
)

watch(categories, async () => {
  if (visible.value) {
    await nextTick()
    bindIo()
  }
})

onBeforeUnmount(() => {
  io?.disconnect()
  io = null
})

function reset() {
  L.value = R.value = 'view'
  delIds.value = []
  editNames.value = {}
  chk.value = new Set()
  draft.value = {}
  addingCat.value = false
  nameCat.value = ''
  exitInfoAddMode()
}

function cancelL() {
  L.value = 'view'
  delIds.value = []
  editNames.value = {}
  addingCat.value = false
  nameCat.value = ''
}

function cancelR() {
  R.value = 'view'
  chk.value = new Set()
  draft.value = {}
  exitInfoAddMode()
}

function enterDelCat() {
  addingCat.value = false
  nameCat.value = ''
  exitInfoAddMode()
  L.value = 'del'
}

function cancelAddCat() {
  addingCat.value = false
  nameCat.value = ''
}

function openCat() {
  if (R.value !== 'view') cancelR()
  exitInfoAddMode()
  nameCat.value = ''
  addingCat.value = true
}

function saveCat() {
  const name = nameCat.value.trim()
  if (!name) return ElMessage.warning('请填写类别名称')
  if (categories.value.some((c) => c.name === name)) return ElMessage.warning('类别名称已存在')
  const cat: InfoCategory = { id: uid('cat'), name, isDefault: false }
  categories.value = [...categories.value, cat]
  saveTenantCategories(categories.value)
  activeId.value = cat.id
  addingCat.value = false
  nameCat.value = ''
  ElMessage.success('类别已新增')
  nextTick(() => {
    bindIo()
    nav(cat.id)
  })
}

function startEditCat() {
  if (R.value !== 'view') cancelR()
  exitInfoAddMode()
  addingCat.value = false
  nameCat.value = ''
  L.value = 'edit'
  const m: Record<string, string> = {}
  categories.value.forEach((c) => {
    if (!c.isDefault) m[c.id] = c.name
  })
  editNames.value = m
}

async function confirmL() {
  if (L.value === 'del') {
    if (!delIds.value.length) return ElMessage.warning('请选择要删除的类别')
    try {
      await ElMessageBox.confirm(
        `确定删除选中的 ${delIds.value.length} 个类别？其下信息将移至「${DEFAULT_CATEGORY_NAME}」。`,
        '确认删除',
        { type: 'warning' },
      )
    } catch {
      return
    }
    const rm = new Set(delIds.value)
    fields.value = fields.value.map((f) => (rm.has(f.categoryId) ? { ...f, categoryId: DEFAULT_CATEGORY_ID } : f))
    categories.value = categories.value.filter((c) => !rm.has(c.id))
    saveTenantCategories(categories.value)
    if (rm.has(activeId.value)) activeId.value = DEFAULT_CATEGORY_ID
    if (await persist()) {
      ElMessage.success('类别已删除')
      cancelL()
      nextTick(bindIo)
    }
    return
  }
  if (L.value === 'edit') {
    const next = categories.value.map((c) =>
      c.isDefault ? c : { ...c, name: (editNames.value[c.id] ?? c.name).trim() || c.name },
    )
    const names = next.filter((c) => !c.isDefault).map((c) => c.name)
    if (new Set(names).size !== names.length) return ElMessage.warning('类别名称不能重复')
    categories.value = next
    saveTenantCategories(categories.value)
    ElMessage.success('类别已保存')
    cancelL()
  }
}

function toggleInfoAddMode() {
  if (L.value !== 'view') cancelL()
  if (infoAddMode.value) exitInfoAddMode()
  else {
    infoAddMode.value = true
    addingFieldCatId.value = null
    nf.value = { lb: '', v: '' }
  }
}

function onClickFieldPlus(catId: string) {
  if (addingFieldCatId.value === catId) {
    addingFieldCatId.value = null
    nf.value = { lb: '', v: '' }
  } else {
    addingFieldCatId.value = catId
    nf.value = { lb: '', v: '' }
  }
}

function cancelFieldInline() {
  addingFieldCatId.value = null
  nf.value = { lb: '', v: '' }
}

function enterDelField() {
  if (L.value !== 'view') cancelL()
  addingCat.value = false
  nameCat.value = ''
  exitInfoAddMode()
  R.value = 'del'
  chk.value = new Set()
}

function startEditField() {
  if (L.value !== 'view') cancelL()
  addingCat.value = false
  nameCat.value = ''
  exitInfoAddMode()
  R.value = 'edit'
  chk.value = new Set()
  mvTo.value = activeId.value
  const d: Record<string, { lb: string; v: string }> = {}
  for (const r of flatRows.value) {
    if (r.sys && r.fk) d[r.k] = { lb: r.lb, v: sys[r.fk] }
    else if (r.cid) {
      const f = fields.value.find((x) => x.id === r.cid)
      if (f) d[r.k] = { lb: f.label, v: f.value }
    }
  }
  draft.value = d
}

async function persist() {
  saving.value = true
  try {
    const dto: DeviceInfoDto = {
      id: props.deviceInfo.id,
      equipmentId: props.deviceId,
      equipmentName: sys.equipmentName,
      deviceModel: sys.deviceModel,
      deviceFactory: sys.deviceFactory,
      locationDetail: sys.locationDetail,
      pressure: Number(sys.pressure) || 0,
      rotationSpeed: Number(sys.rotationSpeed) || 0,
      designFlow: Number(sys.designFlow) || 0,
      onlineStatus: props.deviceInfo.onlineStatus,
    }
      ; (dto as any).deviceNewInfo = buildDeviceNewInfoPayload(stripUiVerifySeedFields(fields.value))
    const res = await editEquipmentInfo(props.deviceId, dto)
    if (res.rc === 0) {
      emit('saved')
      return true
    }
    ElMessage.error(res.err || '保存失败')
    return false
  } catch (e) {
    console.error(e)
    ElMessage.error('保存失败')
    return false
  } finally {
    saving.value = false
  }
}

async function saveFieldInline() {
  const cid = addingFieldCatId.value
  if (!cid) return ElMessage.warning('请选择要添加到的类别')
  const lb = nf.value.lb.trim()
  const v = nf.value.v.trim()
  if (!lb) return ElMessage.warning('请填写名称')
  if (!v) return ElMessage.warning('请填写值')
  if (fields.value.some((f) => f.categoryId === cid && f.label === lb)) return ElMessage.warning('该类别下已存在相同名称的信息')
  fields.value.push({ id: uid('fld'), label: lb, value: v, categoryId: cid, type: 'input' })
  if (await persist()) {
    ElMessage.success('已添加')
    nf.value = { lb: '', v: '' }
  } else fields.value.pop()
}

async function confirmR() {
  if (R.value === 'del') {
    const ids = [...chk.value].filter((k) => k.startsWith('c:'))
    if (!ids.length) return ElMessage.warning('请选择要删除的自定义信息')
    try {
      await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条信息？`, '确认删除', { type: 'warning' })
    } catch {
      return
    }
    const rm = new Set(ids.map((k) => k.slice(2)))
    fields.value = fields.value.filter((f) => !rm.has(f.id))
    if (await persist()) {
      ElMessage.success('已删除')
      cancelR()
    }
    return
  }
  if (R.value === 'edit') {
    for (const r of flatRows.value) {
      const d = draft.value[r.k]
      if (!d) continue
      if (r.sys && r.fk) sys[r.fk] = String(d.v ?? '').trim()
      else if (r.cid) {
        const lb = String(d.lb ?? '').trim()
        const v = String(d.v ?? '').trim()
        if (!lb || !v) return ElMessage.warning('自定义信息的名称和值不能为空')
        const i = fields.value.findIndex((f) => f.id === r.cid)
        const ex = i >= 0 ? fields.value[i] : undefined
        if (ex) {
          const dup = fields.value.some((f, j) => j !== i && f.categoryId === ex.categoryId && f.label === lb)
          if (dup) return ElMessage.warning('该类别下已存在相同名称的信息')
          fields.value[i] = { ...ex, label: lb, value: v }
        }
      }
    }
    const mvIds = [...chk.value].filter((k) => k.startsWith('c:'))
    if (mvIds.length) {
      const set = new Set(mvIds.map((k) => k.slice(2)))
      const t = mvTo.value
      fields.value = fields.value.map((f) => (set.has(f.id) ? { ...f, categoryId: t } : f))
    }
    if (await persist()) {
      ElMessage.success(mvIds.length ? '已保存，分类已更新' : '已保存')
      cancelR()
    }
  }
}
</script>

<style lang="scss" scoped>
$c: #303133;
$g: #606266;
$m: #909399;
$b: #e4e7ed;
$p: #409eff;

.layout {
  display: flex;
  height: min(65vh, 560px);
  min-height: 360px;
  font-size: 14px;
  color: $c;
}

.cat {
  flex: 0 0 25%;
  max-width: 25%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid $b;
  padding-right: 16px;
  box-sizing: border-box;
}

.cat-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  flex: 1;
  overflow-y: auto;
}

.cat li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  border-radius: 6px;
  margin-bottom: 2px;
  font-size: 13px;
  color: $g;
  cursor: pointer;

  :deep(.el-checkbox) {
    flex: 1;
    min-width: 0;
  }

  :deep(.el-checkbox__label) {
    flex: 1;
    min-width: 0;
    line-height: 1.4;
    white-space: normal;
  }

  &:hover {
    background: #f5f7fa;
  }

  &.on {
    background: #ecf5ff;
    color: $p;
    font-weight: 500;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 2px;
      background: $p;
    }
  }
}

.cat-txt {
  flex: 1;
  min-width: 0;
  word-break: break-word;
  line-height: 1.4;
}

.lock {
  color: $m;
  font-size: 14px;
}

.main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
  box-sizing: border-box;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  padding: 16px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  scroll-behavior: smooth;
}

.sec {
  scroll-margin-top: 12px;

  &:not(:first-child) {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #dfe3eb;
  }
}

.sec-h {
  margin: 0 0 14px;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 600;
  border-left: 3px solid $p;
}

.empty {
  margin: 0;
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: $m;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;

  &.chk {
    align-items: center;
  }
}

.card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid $b;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:hover:not(.ed) {
    border-color: #c6e2ff;
  }

  &.sys:not(.ed) {
    background: #fafcff;
    border-color: #d9ecff;
  }

  &.ed {
    flex-flow: row wrap;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
  }
}

.lb {
  font-size: 12px;
  color: $m;
}

.val {
  font-size: 14px;
  font-weight: 500;
  color: $c;
  word-break: break-word;
}

.inp {
  flex: 1;
  min-width: 100px;
}

.lb-inp {
  max-width: 120px;
}

.cat-inline-add-wrap {
  list-style: none;
  margin: 0;
  padding: 10px 12px 12px 14px;
  cursor: default;
}

.cat-inline-add {
  background: #f5f7fa;
  border: 1px dashed $b;
  border-radius: 6px;
  padding: 10px 12px;
}

.row--add {
  align-items: stretch;
  min-width: 0;
}

.add-plus {
  width: 100%;
  min-height: 64px;
  border: 1px dashed #c0c4cc;
  border-radius: 6px;
  background: #fff;
  color: $p;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    border-color: $p;
    background: #ecf5ff;
  }

  &.on {
    border-color: $p;
    background: #ecf5ff;
    font-weight: 600;
  }
}

.field-inline-add {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid $b;
  border-radius: 6px;
}

.field-inline-add__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mv {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 14px;
  font-size: 13px;
  color: $g;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
}

.sel {
  width: 200px;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $b;
}

.foot-label {
  width: 100%;
  font-size: 13px;
  color: $g;
  line-height: 1.4;
}

.cat .foot {
  margin-top: 12px;
}

.form .row2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.form .lbl {
  width: 72px;
  flex-shrink: 0;
  text-align: right;
  font-size: 13px;
  color: $g;
}

.grow {
  flex: 1;
  min-width: 0;
}

@media (max-width: 800px) {
  .layout {
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .cat {
    flex: 0 0 auto;
    max-width: 100%;
    border-right: 0;
    border-bottom: 1px solid $b;
    padding-right: 0;
    padding-bottom: 10px;
  }

  .cat-list {
    max-height: 180px;
  }

  .main {
    padding-left: 0;
    padding-top: 10px;
  }

  .scroll {
    padding: 10px;
    margin-bottom: 10px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .sel {
    width: 100%;
  }
}
</style>

<style lang="scss">
.device-info-dlg.el-dialog {
  color: #303133 !important;

  .el-dialog__title {
    font-size: 16px;
    font-weight: 600;
    color: #303133 !important;
  }

  .el-dialog__body {
    color: #303133 !important;
    font-size: 14px;
  }

  .el-dialog__headerbtn .el-dialog__close {
    color: #909399 !important;

    &:hover {
      color: #409eff !important;
    }
  }

  .el-checkbox__label {
    color: #606266 !important;
    font-size: 13px !important;
  }

  .el-input__inner,
  .el-select__placeholder,
  .el-select__selected-item,
  .el-select .el-input__inner {
    color: #606266 !important;
    font-size: 13px !important;
  }

  .el-input__inner::placeholder,
  .el-select__placeholder {
    color: #a8abb2 !important;
  }

  .el-input__wrapper,
  .el-select .el-input__wrapper {
    background: #fff;
    box-shadow: 0 0 0 1px #dcdfe6 inset;
  }

  .el-input__wrapper:hover,
  .el-select .el-input__wrapper:hover {
    box-shadow: 0 0 0 1px #c0c4cc inset;
  }

  .el-input__wrapper.is-focus,
  .el-select .el-input__wrapper.is-focus {
    box-shadow: 0 0 0 1px #409eff inset;
  }
}

.device-info-dlg--main.el-dialog {
  width: 80vw !important;
  max-width: 80vw !important;
}

.device-info-dlg--sub.el-dialog {
  width: 50vw !important;
  max-width: 520px !important;
}

.device-info-popper.el-popper .el-select-dropdown__item {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
  color: #606266;
}

.device-info-popper.el-popper .el-select-dropdown__item:hover,
.device-info-popper.el-popper .el-select-dropdown__item.is-hovering,
.device-info-popper.el-popper .el-select-dropdown__item.is-hover {
  background: #f5f7fa;
}

.device-info-popper.el-popper .el-select-dropdown__item.is-selected {
  font-weight: 500;
  color: #409eff;
}

@media (max-width: 800px) {
  .device-info-dlg--main.el-dialog {
    width: 96vw !important;
    max-width: 96vw !important;
    margin-top: 5vh !important;
  }

  .device-info-dlg--main .el-dialog__body {
    padding: 10px 12px 12px !important;
  }
}
</style>
