/*
 * SJTUMUNC 官网 · 问卷入口配置
 * 只需要改 url 这一行；其他保持默认即可。
 */
window.SJTUM_SURVEY = {
  url: "https://wj.qq.com/s2/28355460/mnlf/", // 腾讯问卷链接
  entry: false,         // 不使用固定左下角入口
  popup: true,          // 默认开启：使用 4 分钟后出现一次轻弹窗
  popupDelay: 240000,   // 4 分钟（同一标签页内跨页面累计）
  dismissDays: 7,       // 弹窗出现过/关闭后 7 天内不再弹
  footer: true          // 在页脚联系人区放文字链接
};
