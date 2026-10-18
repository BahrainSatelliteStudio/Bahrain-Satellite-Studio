# WowIPTV

> 轻量级 Android IPTV 播放器，支持 Xtream Codes 与 M3U 源，开箱即用。

[English](README.md) · **简体中文** ([README.zh-CN.md](README.zh-CN.md))

WowIPTV 是一款面向 Android 的 IPTV 客户端，支持直播、点播电影与剧集，提供 EPG 节目单、多源管理与中英双语界面。基于 Jetpack Compose 构建，UI 采用深色渐变 + 毛玻璃风格，为 IPTV 场景做了大量细节优化。

## 功能特性

- **多源管理** — 同时维护多个 Xtream / M3U 源，一键切换、单源/全源同步
- **直播 (Live TV)** — 分类浏览、频道搜索、收藏频道、EPG 节目单、实时网速显示
- **电影 (VOD)** — 分类 + 搜索 + 收藏，进度续播，播放速度调节
- **剧集 (Series)** — 分季分集，观看进度标记，自动连播下一集
- **EPG 节目单** — 时间线视图、当前/下一节目展示、横竖屏切换
- **播放器体验** — 倍速、音轨切换、音量手势、断流刷新、后台返回自动续播、左右竖滑调亮度/音量、视频实际清晰度显示
- **画中画 (PiP)** — 播放时按 Home 或点画中画按钮进入小窗，可继续观看
- **数据管理** — 继续观看 / 历史记录 / 收藏一键清空，图片缓存清理，缓存重新同步
- **版本更新** — 启动自动检测 GitHub 最新版本（可关闭），支持一键下载与安装
- **多语言** — 中文 / English，支持跟随系统，Android 13+ 系统"每应用语言"联动
- **个性化** — 默认倍速、播放器状态栏开关、首页模块显隐、启动预加载、自动检查更新开关
- **家长/分类锁定** — 直播/电影/剧集按分类加锁，设管理密码锁定；被锁分类内容在"全部"列表、收藏与主页中隐藏，切换离开后自动重新上锁
- **视觉风格** — 深色渐变背景、品牌辉光、毛玻璃卡片、沉浸式状态栏、14 种主题色一键切换
- **平板 (PAD)** — 横屏平板响应式布局：左侧导航栏（设置置底）+ 全局搜索栏；直播双栏（侧边栏 + 播放区含 EPG 条）；电影/剧集工具栏（4 档排序、按设备分档列数 2/3 或 6/8）；详情页 hero 模糊背景；内置节目单页；设置双栏

## 技术栈

| 类别 | 选型 |
|---|---|
| 语言 / UI | Kotlin · Jetpack Compose (Material 3) |
| 架构 | MVVM + Clean Architecture (data / domain / presentation) |
| 网络 | Retrofit · OkHttp |
| 本地存储 | Room (内容缓存) · DataStore (源配置与偏好) |
| 媒体播放 | Media3 ExoPlayer |
| 图片加载 | Coil |
| 依赖注入 | Hilt |
| 导航 | Navigation Compose |
| 多语言 | Android 资源体系 + appcompat AppLocales |

## 环境要求

- minSdk 31 (Android 12+)
- targetSdk 36，compileSdk 37
- JDK 17
- AGP 9.2.1 · Kotlin 2.1.20

## 构建

```bash
./gradlew.bat :app:assembleDebug   # Windows
./gradlew :app:assembleDebug       # macOS / Linux
```

产物位于 `app/build/outputs/apk/debug/`。

## 使用说明

1. 安装 APK 后进入 **设置** 页
2. 点击 **添加源**：
   - **Xtream**：填写名称、服务器地址、端口、用户名、密码
   - **M3U**：填写名称、M3U 链接，或直接导入本地 `.m3u` 文件
3. 添加后自动同步数据，即可在主页/直播/电影/剧集页浏览观看
4. 可在设置页切换默认源、语言、播放器偏好等

## 架构

```
app/
├── data/
│   ├── remote/xtream/      # Retrofit API + DTO
│   ├── local/              # Room entity / DAO / DataStore 偏好
│   ├── parser/             # M3U 播放列表解析
│   ├── repository/         # 仓库实现
│   └── di/                 # Hilt 模块
├── domain/
│   ├── model/              # 业务模型
│   ├── repository/         # 仓库接口
│   └── usecase/            # 用例
└── presentation/
    ├── navigation/         # NavGraph + 路由
    ├── main/               # 主框架 + 底部导航
    ├── home/               # 主页 / 收藏 / 历史 / 全部内容
    ├── live/               # 直播 + EPG
    ├── movies/             # 电影
    ├── series/             # 剧集
    ├── player/             # 播放器
    ├── epg/                # EPG 时间线
    ├── settings/           # 设置与源管理
    └── common/             # 主题 / 公共组件
```

**关键约定**

- `domain` 层零 Android 依赖（纯 Kotlin）
- 同一时刻只有一个激活源，切换源会触发全局数据刷新
- 数据缓存按源隔离（`sourceId`），切换源互不污染

## 免责声明

- 本应用仅提供播放功能，不包含任何频道/内容源
- 请自行确保所使用的 IPTV 源拥有合法授权
- 请在遵守当地法律法规的前提下使用

## License

本项目基于 [MIT](LICENSE) 协议开源 © jack
