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
 * 如果结束日期是今天，则结束时间设为当前时刻
 * 如果结束日期不是今天，则结束时间设为23:59:59
 * 如果没有选择日期，则返回null保持空状态
 * 
 * @param dateRange 日期范围数组 [startDate, endDate] 或 null
 * @returns 处理后的日期范围字符串数组或null
 */
export function handleDatePickerChange(dateRange: [Date, Date] | null): [string, string] | null {
    // 如果没有选择日期，保持空状态
    if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1]) {
        return null;
    }

    const [start, end] = dateRange;
    const now = new Date();
    const startDateStr = formatDateTime(start);
    
    // 判断结束日期是否为今天
    if (isToday(end)) {
        // 如果是今天，结束时间设为当前时刻
        const endDateStr = formatDateTime(now);
        return [startDateStr, endDateStr];
    } else {
        // 如果不是今天，结束时间设为23:59:59
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        const endDateStr = formatDateTime(endOfDay);
        return [startDateStr, endDateStr];
    }
}

/**
 * 获取时间选择器的默认结束时间
 * 如果结束日期是今天，则默认结束时间为此时此刻
 * 如果结束日期不是今天，则默认结束时间为23:59:59
 * 
 * @param endDate 结束日期
 * @returns 默认的结束时间字符串
 */
export function getDefaultEndTime(endDate: Date): string {
    const now = new Date();
    
    // 判断结束日期是否为今天
    if (isToday(endDate)) {
        // 如果是今天，结束时间设为当前时刻
        return formatDateTime(now);
    } else {
        // 如果不是今天，结束时间设为23:59:59
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        return formatDateTime(endOfDay);
    }
}

/**
 * 初始化时间范围的默认值
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns [开始时间字符串, 结束时间字符串]
 */
export function initializeDateRange(startDate: Date, endDate: Date): [string, string] {
    const startTime = formatDateTime(startDate);
    const endTime = getDefaultEndTime(endDate);
    return [startTime, endTime];
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