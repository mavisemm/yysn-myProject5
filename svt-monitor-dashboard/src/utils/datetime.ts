/**
 * 日期时间工具函数
 * 提供统一的时间选择器逻辑处理
 */

/**
 * 格式化日期时间为字符串格式
 * @param date 日期对象
 * @returns 格式化的日期时间字符串 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 判断给定日期是否为今天
 * @param date 要判断的日期
 * @returns 是否为今天
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return today.getTime() === targetDate.getTime();
}

/**
 * 处理时间选择器的日期范围变化
 * 将选中的日期范围格式化为字符串
 *
 * @param dateRange 日期范围数组 [startDate, endDate] 或 null
 * @returns 处理后的日期范围字符串数组或null
 */
export function handleDatePickerChange(dateRange: [Date, Date] | null): [string, string] | null {
    if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1]) {
        return null;
    }
    const [start, end] = dateRange;
    return [formatDateTime(start), formatDateTime(end)];
}

/**
 * 获取最近24小时时间范围（当前时间往前24小时）
 * @returns [开始日期字符串, 结束日期字符串]
 */
export function getLast24HoursRange(): [string, string] {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return [formatDateTime(start), formatDateTime(end)];
}

/**
 * 获取默认时间范围（最近7天）
 * @returns [开始日期字符串, 结束日期字符串]
 */
export function getDefaultDateRange(): [string, string] {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return [formatDateTime(start), formatDateTime(end)];
}

/**
 * 禁用未来日期的验证函数
 * @param time 日期对象
 * @returns 是否禁用该日期
 */
export function disabledFutureDate(time: Date): boolean {
    return time.getTime() > Date.now();
}

/**
 * 初始化日期范围的默认时间
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 处理后的日期时间数组
 */
export function initializeDateRange(startDate: Date, endDate: Date): [Date, Date] {
    // 开始日期设置为 00:00:00
    const startWithDefaultTime = new Date(startDate);
    startWithDefaultTime.setHours(0, 0, 0, 0);

    // 结束日期根据是否为今天设置不同时间
    const endWithDefaultTime = new Date(endDate);
    
    if (isToday(endDate)) {
        // 如果是今天，设置为当前实时时间
        const now = new Date();
        endWithDefaultTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    } else {
        // 如果不是今天，设置为 23:59:59
        endWithDefaultTime.setHours(23, 59, 59, 999);
    }

    return [startWithDefaultTime, endWithDefaultTime];
}