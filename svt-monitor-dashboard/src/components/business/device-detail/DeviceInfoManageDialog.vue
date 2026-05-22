<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="80vw" class="device-info-dlg device-info-dlg--main"
    :close-on-click-modal="false" destroy-on-close append-to-body @closed="handleDialogClosed">
    <div class="layout">
      <aside class="cat">
        <ul class="cat-list">
          <li v-for="c in categories" :key="c.typeId" :class="{ on: c.typeId === activeId }" @click="nav(c.typeId)">
            <template v-if="L === 'del' && !c.isDefault">
              <el-icon class="cat-del" @click.stop="onDeleteCategory(c.typeId)">
                <Delete />
              </el-icon>
              <span class="cat-txt">{{ c.typeName }}</span>
            </template>
            <template v-else-if="L === 'del' && c.isDefault">
              <el-icon class="lock">
                <Lock />
              </el-icon>
              <span class="cat-txt">{{ c.typeName }}</span>
            </template>
            <el-input v-else-if="L === 'edit' && !c.isDefault" v-model="editNames[c.typeId]" size="small" @click.stop />
            <span v-else class="cat-txt">{{ c.typeName }}</span>
          </li>
          <li v-if="L === 'view' && addingCat" class="cat-inline-add-wrap" @click.stop>
            <div v-for="(row, idx) in newCatRows" :key="idx" class="cat-inline-add">
              <el-input v-model="row.name" size="small" placeholder="新类别名称，例如：报警信息" />
            </div>
            <button type="button" class="add-plus cat-add-plus" title="再添加一个类别" @click="addCatRow">
              +
            </button>
          </li>
        </ul>
        <div class="foot">
          <div class="foot-label">类别功能：</div>
          <template v-if="addingCat && L === 'view'">
            <el-button size="small" type="primary" :loading="saving" @click="confirmCatAddMode">确定</el-button>
            <el-button size="small" @click="cancelAddCat">取消</el-button>
          </template>
          <template v-else-if="L === 'view'">
            <el-button size="small" type="success" @click="openCat">新增</el-button>
            <el-button size="small" type="primary" @click="startEditCat">编辑</el-button>
            <el-button size="small" type="danger" @click="enterDelCat">删除</el-button>
          </template>
          <template v-else-if="L === 'del'">
            <el-button size="small" @click="cancelL">取消</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="primary" :loading="saving" @click="confirmL">确定</el-button>
            <el-button size="small" @click="cancelL">取消</el-button>
          </template>
        </div>
      </aside>

      <section class="main">
        <div ref="scrollEl" class="scroll">
          <section v-for="s in sections" :key="s.cat.typeId" :id="secId(s.cat.typeId)" class="sec">
            <h4 class="sec-h">{{ s.cat.typeName }}</h4>
            <p v-if="!s.rows.length && !(R === 'view' && infoAddMode)" class="empty">该类别下暂无信息</p>
            <div v-if="s.rows.length || (R === 'view' && infoAddMode)" class="grid">
              <div v-for="r in s.rows" :key="r.k" class="row" :class="{ chk: R === 'del' || R === 'edit' }">
                <el-icon v-if="R === 'del' && r.sys" class="lock">
                  <Lock />
                </el-icon>
                <el-checkbox v-else-if="R === 'del' || (R === 'edit' && !r.sys)" :model-value="chk.has(r.k)"
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
              <div v-if="R === 'view' && infoAddMode && !s.cat.isDefault" class="row row--add">
                <button type="button" class="add-plus" :class="{ on: addingFieldCatId === s.cat.typeId }"
                  title="在此类别添加信息" @click="onClickFieldPlus(s.cat.typeId)">
                  +
                </button>
              </div>
            </div>
            <div v-if="R === 'view' && infoAddMode && addingFieldCatId === s.cat.typeId" class="field-inline-add">
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
            <el-option v-for="c in moveTargetCategories" :key="c.typeId" :label="c.typeName" :value="c.typeId" />
          </el-select>
        </div>

        <div class="foot">
          <div class="foot-label">信息功能：</div>
          <template v-if="infoAddMode && R === 'view'">
            <el-button size="small" type="primary" :loading="saving" @click="confirmInfoAddMode">确定</el-button>
            <el-button size="small" @click="exitInfoAddMode">取消</el-button>
          </template>
          <template v-else-if="R === 'view'">
            <el-button size="small" type="success" @click="toggleInfoAddMode">新增</el-button>
            <el-button size="small" type="primary" @click="startEditField">编辑</el-button>
            <el-button size="small" type="danger" @click="enterDelField">删除</el-button>
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
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Lock, WarningFilled } from '@element-plus/icons-vue'
import {
  FRONTEND_DEFAULT_TYPE_ID,
  SYSTEM_FIELDS,
  createFrontendDefaultCategory,
  isFrontendDefaultTypeId,
  type InfoCategory,
  type SystemFieldKey,
} from './deviceInfoMeta'
import { editEquipmentInfo, type DeviceInfoDto } from '@/api/modules/hardware'
import {
  createVibrationDeviceExtendInfo,
  createVibrationDeviceType,
  deleteVibrationDeviceExtendInfoBatch,
  deleteVibrationDeviceType,
  listVibrationDeviceExtendInfo,
  listVibrationDeviceTypes,
  updateVibrationDeviceExtendInfoBatch,
  updateVibrationDeviceType,
  type DeviceExtendInfoItem,
} from '@/api/modules/vibrationDeviceInfo'

type LMode = 'view' | 'del' | 'edit'
type RMode = 'view' | 'del' | 'edit'

type Row = {
  k: string
  lb: string
  val: string
  sys: boolean
  fk?: SystemFieldKey
  typeInfoId?: number
}

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
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const dialogTitle = computed(() => `设备信息管理 — ${props.equipmentName?.trim() || props.deviceId}`)

const apiCategories = ref<InfoCategory[]>([])
const frontendDefaultCategory = createFrontendDefaultCategory()
const categories = computed(() => [frontendDefaultCategory, ...apiCategories.value])
const moveTargetCategories = computed(() => apiCategories.value)
const extendFields = ref<DeviceExtendInfoItem[]>([])
const sys = reactive<Record<SystemFieldKey, string>>({
  equipmentName: '',
  deviceModel: '',
  deviceFactory: '',
  locationDetail: '',
  pressure: '',
  rotationSpeed: '',
  designFlow: '',
})

const defaultTypeId = FRONTEND_DEFAULT_TYPE_ID
const activeId = ref<number>(FRONTEND_DEFAULT_TYPE_ID)
const scrollEl = ref<HTMLElement | null>(null)
const L = ref<LMode>('view')
const R = ref<RMode>('view')
const saving = ref(false)
const editNames = ref<Record<number, string>>({})
const addingCat = ref(false)
const newCatRows = ref<{ name: string }[]>([{ name: '' }])
const infoAddMode = ref(false)
const addingFieldCatId = ref<number | null>(null)
const nf = ref({ lb: '', v: '' })
const chk = ref(new Set<string>())
const draft = ref<Record<string, { lb: string; v: string }>>({})
const mvTo = ref<number | null>(null)

let io: IntersectionObserver | null = null

const secId = (typeId: number) => `dic-${typeId}`

const fmt = (fk: SystemFieldKey, raw: string) => {
  const x = raw.trim()
  if (!x) return '—'
  if (fk === 'rotationSpeed') return `${x} rpm`
  if (fk === 'designFlow') return `${x} m³/h`
  if (fk === 'pressure') return `${x} MPa`
  return x
}

function rowsFor(typeId: number, isDefaultCat: boolean): Row[] {
  if (isDefaultCat) {
    return SYSTEM_FIELDS.map(([fk, lb]) => ({
      k: `s:${fk}`,
      lb,
      val: fmt(fk, sys[fk]),
      sys: true,
      fk,
    }))
  }
  return extendFields.value
    .filter((f) => f.typeId === typeId)
    .map((f) => ({
      k: `e:${f.typeInfoId}`,
      lb: f.itemKey,
      val: f.itemValue || '—',
      sys: false,
      typeInfoId: f.typeInfoId,
    }))
}

const sections = computed(() =>
  categories.value.map((cat) => ({
    cat,
    rows: rowsFor(cat.typeId, cat.isDefault),
  })),
)

const flatRows = computed(() => sections.value.flatMap((s) => s.rows))

function syncSystemFieldsFromProps() {
  const d = props.deviceInfo
    ; (Object.keys(sys) as SystemFieldKey[]).forEach((k) => {
      sys[k] = String((d as Record<string, unknown>)[k] ?? '')
    })
}

function ensureActiveId() {
  if (!categories.value.some((c) => c.typeId === activeId.value)) {
    activeId.value = defaultTypeId
  }
}

async function refreshCategories(): Promise<boolean> {
  const res = await listVibrationDeviceTypes()
  if (res.rc !== 0) {
    ElMessage.error(res.err || '加载类别失败')
    return false
  }
  apiCategories.value = res.ret ?? []
  ensureActiveId()
  return true
}

async function refreshExtendInfos(): Promise<boolean> {
  if (!props.deviceId) return false
  const res = await listVibrationDeviceExtendInfo(props.deviceId)
  if (res.rc !== 0) {
    ElMessage.error(res.err || '加载设备信息失败')
    return false
  }
  extendFields.value = res.ret ?? []
  return true
}

async function loadDialogData() {
  syncSystemFieldsFromProps()
  await Promise.all([refreshCategories(), refreshExtendInfos()])
}

async function handleDialogClosed() {
  if (props.deviceId) {
    try {
      await Promise.all([refreshCategories(), refreshExtendInfos()])
    } catch {
      /* 关弹窗时与后端对齐，失败忽略 */
    }
  }
  reset()
}

function cloneExtendFields() {
  return extendFields.value.map((f) => ({ ...f }))
}

function cloneApiCategories() {
  return apiCategories.value.map((c) => ({ ...c }))
}

function hasExtendInfoForType(typeId: number) {
  return extendFields.value.some((f) => f.typeId === typeId)
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
      if (top?.id?.startsWith('dic-')) activeId.value = Number(top.id.slice(4))
    },
    { root, rootMargin: '-8% 0px -72% 0px', threshold: [0, 0.25, 0.5] },
  )
  categories.value.forEach((c) => {
    const el = document.getElementById(secId(c.typeId))
    if (el) io!.observe(el)
  })
}

function nav(typeId: number) {
  if (L.value === 'view' && R.value === 'view') {
    activeId.value = typeId
    nextTick(() =>
      document.getElementById(secId(typeId))?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }
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

async function confirmInfoAddMode() {
  saving.value = true
  try {
    await refreshExtendInfos()
    exitInfoAddMode()
  } catch (e) {
    console.error(e)
    ElMessage.error('刷新信息列表失败')
  } finally {
    saving.value = false
  }
}

watch(visible, async (o) => {
  if (o) {
    reset()
    saving.value = true
    try {
      await loadDialogData()
    } finally {
      saving.value = false
    }
    await nextTick()
    bindIo()
  } else {
    io?.disconnect()
    io = null
  }
})

watch(
  () => props.deviceInfo,
  () => {
    if (visible.value) syncSystemFieldsFromProps()
  },
  { deep: true },
)

watch(apiCategories, async () => {
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
  editNames.value = {}
  chk.value = new Set()
  draft.value = {}
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
  exitInfoAddMode()
}

function cancelL() {
  L.value = 'view'
  editNames.value = {}
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
}

function cancelR() {
  R.value = 'view'
  chk.value = new Set()
  draft.value = {}
  exitInfoAddMode()
}

function enterDelCat() {
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
  exitInfoAddMode()
  L.value = 'del'
}

function cancelAddCat() {
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
}

async function confirmCatAddMode() {
  const names = newCatRows.value.map((r) => r.name.trim()).filter(Boolean)
  if (!names.length) return ElMessage.warning('请填写类别名称')
  if (new Set(names).size !== names.length) return ElMessage.warning('类别名称不能重复')
  if (names.some((n) => categories.value.some((c) => c.typeName === n))) {
    return ElMessage.warning('类别名称已存在')
  }
  const snapCats = cloneApiCategories()
  saving.value = true
  let lastTypeId: number | null = null
  try {
    for (const typeName of names) {
      const res = await createVibrationDeviceType(typeName)
      if (res.rc !== 0) {
        ElMessage.error(res.err || '新增类别失败')
        apiCategories.value = snapCats
        return
      }
      const typeId = typeof res.ret === 'number' ? res.ret : Date.now()
      apiCategories.value.push({ typeId, typeName, isDefault: false })
      lastTypeId = typeId
    }
    await refreshCategories()
    addingCat.value = false
    newCatRows.value = [{ name: '' }]
    ElMessage.success(names.length > 1 ? `已新增 ${names.length} 个类别` : '类别已新增')
    if (lastTypeId != null) {
      activeId.value = lastTypeId
      await nextTick()
      bindIo()
      nav(lastTypeId)
    }
  } catch (e) {
    console.error(e)
    apiCategories.value = snapCats
    ElMessage.error('新增类别失败')
  } finally {
    saving.value = false
  }
}

function addCatRow() {
  newCatRows.value = [...newCatRows.value, { name: '' }]
}

function openCat() {
  if (R.value !== 'view') cancelR()
  exitInfoAddMode()
  newCatRows.value = [{ name: '' }]
  addingCat.value = true
}

function startEditCat() {
  if (R.value !== 'view') cancelR()
  exitInfoAddMode()
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
  L.value = 'edit'
  const m: Record<number, string> = {}
  apiCategories.value.forEach((c) => {
    m[c.typeId] = c.typeName
  })
  editNames.value = m
}

async function onDeleteCategory(typeId: number) {
  if (isFrontendDefaultTypeId(typeId)) return
  const hasInfo = hasExtendInfoForType(typeId)
  const msg = hasInfo
    ? `是否删除该类别,会一并删除该类别下的所有信息`
    : '是否删除该类别'
  try {
    await ElMessageBox.confirm(msg, '确认删除', { type: 'warning' })
  } catch {
    return
  }
  const snapCats = cloneApiCategories()
  const snapExt = cloneExtendFields()
  saving.value = true
  try {
    const res = await deleteVibrationDeviceType(typeId)
    if (res.rc !== 0) {
      ElMessage.error(res.err || '删除类别失败')
      return
    }
    apiCategories.value = apiCategories.value.filter((c) => c.typeId !== typeId)
    extendFields.value = extendFields.value.filter((f) => f.typeId !== typeId)
    if (activeId.value === typeId) activeId.value = defaultTypeId
    ElMessage.success('类别已删除')
    await nextTick()
    bindIo()
  } catch (e) {
    console.error(e)
    apiCategories.value = snapCats
    extendFields.value = snapExt
    ElMessage.error('删除类别失败')
  } finally {
    saving.value = false
  }
}

async function confirmL() {
  if (L.value !== 'edit') return
  const pending = apiCategories.value
    .map((c) => ({
      typeId: c.typeId,
      typeName: (editNames.value[c.typeId] ?? c.typeName).trim(),
    }))
    .filter((c) => {
      const orig = apiCategories.value.find((x) => x.typeId === c.typeId)
      return c.typeName && orig && c.typeName !== orig.typeName
    })
  const allNames = [
    frontendDefaultCategory.typeName,
    ...apiCategories.value.map((c) => pending.find((p) => p.typeId === c.typeId)?.typeName ?? c.typeName),
  ]
  if (new Set(allNames).size !== allNames.length) return ElMessage.warning('类别名称不能重复')
  if (!pending.length) {
    cancelL()
    return
  }
  const snapCats = cloneApiCategories()
  saving.value = true
  try {
    for (const item of pending) {
      const res = await updateVibrationDeviceType(item.typeId, item.typeName)
      if (res.rc !== 0) {
        ElMessage.error(res.err || '保存类别失败')
        apiCategories.value = snapCats
        return
      }
      const i = apiCategories.value.findIndex((c) => c.typeId === item.typeId)
      const cur = i >= 0 ? apiCategories.value[i] : undefined
      if (cur) {
        apiCategories.value[i] = { typeId: cur.typeId, typeName: item.typeName, isDefault: cur.isDefault }
      }
    }
    ElMessage.success('类别已保存')
    cancelL()
  } catch (e) {
    console.error(e)
    apiCategories.value = snapCats
    ElMessage.error('保存类别失败')
  } finally {
    saving.value = false
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

function onClickFieldPlus(typeId: number) {
  if (addingFieldCatId.value === typeId) {
    addingFieldCatId.value = null
    nf.value = { lb: '', v: '' }
  } else {
    addingFieldCatId.value = typeId
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
  newCatRows.value = [{ name: '' }]
  exitInfoAddMode()
  R.value = 'del'
  chk.value = new Set()
}

function startEditField() {
  if (L.value !== 'view') cancelL()
  addingCat.value = false
  newCatRows.value = [{ name: '' }]
  exitInfoAddMode()
  R.value = 'edit'
  chk.value = new Set()
  const firstMove = moveTargetCategories.value[0]
  mvTo.value =
    !isFrontendDefaultTypeId(activeId.value) && moveTargetCategories.value.some((c) => c.typeId === activeId.value)
      ? activeId.value
      : (firstMove?.typeId ?? null)
  const d: Record<string, { lb: string; v: string }> = {}
  for (const r of flatRows.value) {
    if (r.sys && r.fk) d[r.k] = { lb: r.lb, v: sys[r.fk] }
    else if (r.typeInfoId != null) {
      const f = extendFields.value.find((x) => x.typeInfoId === r.typeInfoId)
      if (f) d[r.k] = { lb: f.itemKey, v: f.itemValue }
    }
  }
  draft.value = d
}

async function persistSystemFields(): Promise<boolean> {
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
  const res = await editEquipmentInfo(props.deviceId, dto)
  if (res.rc === 0) {
    emit('saved')
    return true
  }
  ElMessage.error(res.err || '保存失败')
  return false
}

async function saveFieldInline() {
  const typeId = addingFieldCatId.value
  if (typeId == null || isFrontendDefaultTypeId(typeId)) return ElMessage.warning('请选择要添加到的类别')
  const itemKey = nf.value.lb.trim()
  const itemValue = nf.value.v.trim()
  if (!itemKey) return ElMessage.warning('请填写名称')
  if (!itemValue) return ElMessage.warning('请填写值')
  if (extendFields.value.some((f) => f.typeId === typeId && f.itemKey === itemKey)) {
    return ElMessage.warning('该类别下已存在相同名称的信息')
  }
  saving.value = true
  try {
    const res = await createVibrationDeviceExtendInfo({
      equipmentId: props.deviceId,
      itemKey,
      itemValue,
      typeId,
    })
    if (res.rc !== 0) {
      ElMessage.error(res.err || '添加失败')
      return
    }
    const typeInfoId = typeof res.ret === 'number' ? res.ret : -Date.now()
    extendFields.value.push({
      typeInfoId,
      equipmentId: props.deviceId,
      itemKey,
      itemValue,
      typeId,
    })
    ElMessage.success('已添加')
    nf.value = { lb: '', v: '' }
    addingFieldCatId.value = null
  } catch (e) {
    console.error(e)
    ElMessage.error('添加失败')
  } finally {
    saving.value = false
  }
}

async function confirmR() {
  if (R.value === 'del') {
    const keys = [...chk.value].filter((k) => k.startsWith('e:'))
    if (!keys.length) return ElMessage.warning('请选择要删除的自定义信息')
    try {
      await ElMessageBox.confirm(`确定删除选中的 ${keys.length} 条信息？`, '确认删除', { type: 'warning' })
    } catch {
      return
    }
    const typeInfoIds = keys.map((k) => Number(k.slice(2)))
    const rm = new Set(typeInfoIds)
    const snapExt = cloneExtendFields()
    saving.value = true
    try {
      const res = await deleteVibrationDeviceExtendInfoBatch(typeInfoIds)
      if (res.rc !== 0) {
        ElMessage.error(res.err || '删除失败')
        return
      }
      extendFields.value = extendFields.value.filter((f) => !rm.has(f.typeInfoId))
      ElMessage.success('已删除')
      cancelR()
    } catch (e) {
      console.error(e)
      extendFields.value = snapExt
      ElMessage.error('删除失败')
    } finally {
      saving.value = false
    }
    return
  }
  if (R.value === 'edit') {
    let sysChanged = false
    const batch: {
      typeInfoId: number
      itemKey: string
      itemValue: string
      typeId: number
    }[] = []

    for (const r of flatRows.value) {
      const d = draft.value[r.k]
      if (!d) continue
      if (r.sys && r.fk) {
        const next = String(d.v ?? '').trim()
        if (sys[r.fk] !== next) {
          sys[r.fk] = next
          sysChanged = true
        }
        continue
      }
      if (r.typeInfoId == null) continue
      const itemKey = String(d.lb ?? '').trim()
      const itemValue = String(d.v ?? '').trim()
      if (!itemKey || !itemValue) return ElMessage.warning('自定义信息的名称和值不能为空')
      const ex = extendFields.value.find((f) => f.typeInfoId === r.typeInfoId)
      if (!ex) continue
      const dup = extendFields.value.some(
        (f) =>
          f.typeInfoId !== ex.typeInfoId &&
          f.typeId === ex.typeId &&
          f.itemKey === itemKey,
      )
      if (dup) return ElMessage.warning('该类别下已存在相同名称的信息')
      let typeId = ex.typeId
      const mvKeys = [...chk.value].filter((k) => k.startsWith('e:'))
      if (mvKeys.includes(r.k) && mvTo.value != null) {
        if (isFrontendDefaultTypeId(mvTo.value)) {
          return ElMessage.warning('不能将信息移动到默认信息类别')
        }
        typeId = mvTo.value
      }
      if (itemKey !== ex.itemKey || itemValue !== ex.itemValue || typeId !== ex.typeId) {
        batch.push({ typeInfoId: ex.typeInfoId, itemKey, itemValue, typeId })
      }
    }

    const snapExt = cloneExtendFields()
    saving.value = true
    try {
      if (batch.length) {
        const res = await updateVibrationDeviceExtendInfoBatch(batch)
        if (res.rc !== 0) {
          ElMessage.error(res.err || '保存失败')
          return
        }
        for (const item of batch) {
          const i = extendFields.value.findIndex((f) => f.typeInfoId === item.typeInfoId)
          if (i < 0) continue
          const cur = extendFields.value[i]!
          extendFields.value[i] = {
            typeInfoId: cur.typeInfoId,
            equipmentId: cur.equipmentId,
            itemKey: item.itemKey,
            itemValue: item.itemValue,
            typeId: item.typeId,
          }
        }
      }
      if (sysChanged) {
        const ok = await persistSystemFields()
        if (!ok) {
          extendFields.value = snapExt
          return
        }
      }
      const moved = [...chk.value].filter((k) => k.startsWith('e:')).length
      ElMessage.success(moved ? '已保存，分类已更新' : '已保存')
      cancelR()
    } catch (e) {
      console.error(e)
      extendFields.value = snapExt
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
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
  flex-shrink: 0;
  color: $m;
  font-size: 14px;
}

.row.chk .lock {
  align-self: center;
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
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 12px 14px;

    .lb {
      line-height: 1.4;
    }

    .inp {
      width: 100%;
      min-width: 0;
    }

    .lb-inp {
      max-width: none;
    }
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cat-inline-add {
  background: #f5f7fa;
  border: 1px dashed $b;
  border-radius: 6px;
  padding: 10px 12px;
}

.cat-add-plus {
  width: 100%;
  min-height: 40px;
  font-size: 22px;
}

.cat-del {
  flex-shrink: 0;
  font-size: 16px;
  color: #f56c6c;
  cursor: pointer;

  &:hover {
    color: #f78989;
  }
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

.cat-del-confirm-msg {
  display: inline;
  margin: 0;
  line-height: 1.5;
  vertical-align: middle;
}

.cat-del-confirm-warn {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin: 0 2px;
  color: #e6a23c;
  vertical-align: -0.15em;
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
