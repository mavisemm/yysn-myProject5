<template>
  <iframe
    class="device-sound-trend-embed"
    :src="iframeSrc"
    title="声音趋势分析"
    frameborder="0"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getTenantId } from '@/api/tenant'

const props = defineProps<{
  receiverId: string
  pointName?: string
}>()

const iframeSrc = computed(() => {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const tenantId = getTenantId()
  const params = new URLSearchParams()
  if (tenantId) params.set('tenantId', tenantId)
  params.set('ip', '122.224.196.178')
  const rid = props.receiverId?.trim()
  if (rid) {
    params.set('receiverId', rid)
    params.set('selectedReceiverId', rid)
  }
  const name = props.pointName?.trim()
  if (name) {
    params.set('pointName', name)
    params.set('selectedPointName', name)
  }
  return `${normalizedBase}trend/trend.html?${params.toString()}`
})
</script>

<style lang="scss" scoped>
.device-sound-trend-embed {
  width: 100%;
  height: 100%;
  min-height: 480px;
  border: none;
  background: #fff;
  border-radius: 4px;
}
</style>
