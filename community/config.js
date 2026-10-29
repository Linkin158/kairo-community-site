/* ============================================================
 * Kairo 在线论坛 · 站点配置
 * 改完本文件即可上线；不填后端参数时自动进入「本地演示模式」。
 * ============================================================ */

const SITE_CONFIG = {
  // 论坛名称与标语（展示用）
  siteName: 'Kairo 光影社区',
  slogan: '把拍摄时的那束光，讲给同好们听。',

  // ---- 后端：Supabase 免费层 ----
  // 步骤：① supabase.com 新建项目 → ② SQL Editor 运行同目录 setup.sql →
  //       ③ Project Settings → API 复制下面两项 → ④ 运行 node verify.mjs 验证。
  // 留空 "" 时自动使用本地演示模式（数据只存在本机浏览器，不上传、他人不可见）。
  supabaseUrl: 'https://rhwjoniwsnqthdvejfwu.supabase.co',  // 仅填基址，不要带 /rest/v1/
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJod2pvbml3c25xdGhkdmVqZnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzMxOTAsImV4cCI6MjEwODg0OTE5MH0.xthWTKYB2G21-3NigbrImyuTQQHoUdUrPoeODSB-0uc',

  // 存储图片的 Storage 桶名（在 Supabase 后台创建，详见 README-后端配置.md）
  storageBucket: 'community-media',

  // 板块（顺序即展示顺序）
  boards: [
    { key: 'gear',    name: '器材交流' },
    { key: 'skill',   name: '拍摄技巧' },
    { key: 'critique',name: '作品点评' },
    { key: 'help',    name: '问题求助' },
    { key: 'meetup',  name: '活动约拍' }
  ],

  // 论坛规则（发帖页与首页底部展示）
  rules: [
    '请围绕摄影、器材、作品交流，友善讨论。',
    '不发布违法、色情、暴力、隐私或广告推广内容。',
    '匿名发布，请不要在内容中泄露真实姓名、电话、住址等隐私。',
    '侵权图片、他人作品须标注来源，尊重版权。'
  ],

  // 轮询刷新间隔（毫秒），云端模式下自动拉取新帖 / 新回复；30000 即 30 秒
  pollIntervalMs: 20000,

  // 每页帖子数
  pageSize: 20
};
