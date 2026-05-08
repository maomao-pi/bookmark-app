/**
 * 应用日志工具
 * 统一错误日志记录，便于后期扩展到日志服务
 */

export const logger = {
  /**
   * 记录错误日志
   * @param context 模块/函数名称标识
   * @param error 错误对象
   * @param details 附加信息
   */
  error(context: string, error: unknown, ...details: unknown[]): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[${context}]`, message, ...details);
    if (stack) {
      console.error(`[${context}] Stack:`, stack);
    }
  },

  /**
   * 记录警告日志
   * @param context 模块/函数名称标识
   * @param details 附加信息
   */
  warn(context: string, ...details: unknown[]): void {
    console.warn(`[${context}]`, ...details);
  },

  /**
   * 记录信息日志
   * @param context 模块/函数名称标识
   * @param details 附加信息
   */
  info(context: string, ...details: unknown[]): void {
    console.info(`[${context}]`, ...details);
  },

  /**
   * 记录调试日志（仅在开发环境）
   * @param context 模块/函数名称标识
   * @param details 附加信息
   */
  debug(context: string, ...details: unknown[]): void {
    if (import.meta.env.DEV) {
      console.debug(`[${context}]`, ...details);
    }
  },
};

export default logger;
