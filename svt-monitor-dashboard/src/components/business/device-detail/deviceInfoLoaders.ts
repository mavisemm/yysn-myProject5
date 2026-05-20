export function normalizeDeviceInfoRet(ret: unknown) {
  const raw = ret as Record<string, unknown>
  return {
    ...(ret as object),
    equipmentId: String(raw.equipmentId ?? ''),
    equipmentName: String(raw.equipmentName ?? ''),
  }
}
