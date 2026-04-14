export function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
export function isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return today.getTime() === targetDate.getTime();
}
export function handleDatePickerChange(dateRange: [Date, Date] | null): [string, string] | null {
    if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1]) {
        return null;
    }
    const [start, end] = dateRange;
    return [formatDateTime(start), formatDateTime(end)];
}
export function getLast24HoursRange(): [string, string] {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return [formatDateTime(start), formatDateTime(end)];
}
export function getDefaultDateRange(): [string, string] {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return [formatDateTime(start), formatDateTime(end)];
}
export function disabledFutureDate(time: Date): boolean {
    return time.getTime() > Date.now();
}
export function initializeDateRange(startDate: Date, endDate: Date): [Date, Date] {
    const startWithDefaultTime = new Date(startDate);
    startWithDefaultTime.setHours(0, 0, 0, 0);

    const endWithDefaultTime = new Date(endDate);
    
    if (isToday(endDate)) {
        const now = new Date();
        endWithDefaultTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    } else {
        endWithDefaultTime.setHours(23, 59, 59, 999);
    }

    return [startWithDefaultTime, endWithDefaultTime];
}

export function normalizeEndDateTimeBySelectedDay(
    value?: string | null,
    forceApplyRule: boolean = false
): string | undefined {
    const raw = String(value ?? '').trim()
    if (!raw) return undefined

    const parts = raw.split(' ')
    const datePart = parts[0]
    const timePart = parts[1] ?? ''
    if (!datePart) return undefined

    const dateSegments = datePart.split('-').map((x) => Number(x))
    if (dateSegments.length !== 3 || dateSegments.some((n) => !Number.isFinite(n))) {
        return raw
    }
    const year = dateSegments[0]!
    const month = dateSegments[1]!
    const day = dateSegments[2]!

    // 默认仅在“只选日期导致时间为 00:00:00”时自动补全，避免覆盖用户手动设置的时间。
    // 但如果明确要求“日期变化就按规则重置时间”，则可通过 forceApplyRule 强制执行。
    if (!forceApplyRule && timePart && timePart !== '00:00:00') {
        return raw
    }

    const selectedDate = new Date(year, month - 1, day)
    if (Number.isNaN(selectedDate.getTime())) return raw

    if (isToday(selectedDate)) {
        return formatDateTime(new Date())
    }
    return `${datePart} 23:59:59`
}