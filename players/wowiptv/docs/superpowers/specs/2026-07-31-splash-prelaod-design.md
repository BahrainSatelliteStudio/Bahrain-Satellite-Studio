# Splash 页面与预加载 — 设计

日期: 2026-07-31
状态: 已确认

## 目标

新增 Splash 启动页，展示并预加载会员信息、直播/电影/剧集总数。预加载完成后进入主界面，避免首页数据加载等待。

## 架构

新增 `presentation/splash/` 包：

- `SplashScreen.kt` — 全屏 UI
- `SplashViewModel.kt` — 预加载逻辑

## 预加载任务（并行执行）

1. **本地计数**（DB 读，秒级）：
   - `liveStreamDao.getBySource(sourceId).first().size`
   - `vodStreamDao.getBySource(sourceId).first().size`
   - `seriesDao.getBySource(sourceId).first().size`
   - 显示在 splash 状态行「直播 123 · 电影 456 · 剧集 789」

2. **会员信息**（`GetUserInfoUseCase` 网络）：
   - 成功 → 完整字段存 `SourcePreferences`
   - 失败 → 读上次缓存或显示「VIP 未设置」
   - 3s 超时兜底

3. **后台预热**（fire-and-forget，不阻塞跳转）：
   - `liveTvRepository.refreshAll()`
   - `vodRepository.refreshAll()`
   - `seriesRepository.refreshAll()`
   - 失败 `runCatching` 吞掉

## 数据流

```
MainActivity
  └─ AppNavGraph (start = SPLASH)
       ├─ SplashScreen ← SplashViewModel
       │    ├─ DB counts      → UI 显示
       │    ├─ UserInfo(网络) → SourcePreferences
       │    └─ refreshAll ×3  → DB 预热
       │    └─ 完成 → navigate MAIN
       └─ MainScreen
            ├─ Home: username/expiry ← SourcePreferences
            └─ Settings: UserInfo ← SourcePreferences + 后台刷新
```

## 完成条件

- 计数读完
- 会员信息有结果（成功或 3s 超时）
- 无源（未添加）→ 直接跳主界面

跳转方式：`navigate(MAIN) { popUpTo(SPLASH) { inclusive = true } }`。

## 文件改动

| 文件 | 改动 |
|---|---|
| `Routes.kt` | 新增 `SPLASH = "splash"` |
| `AppNavGraph.kt` | startDestination 改 SPLASH，新增 composable |
| `SourcePreferences.kt` | 新增 username/expDate/maxConnections/allowedOutputFormats 缓存 |
| `SplashViewModel.kt` | 新建，预加载逻辑 |
| `SplashScreen.kt` | 新建，UI |
| `HomeViewModel.kt` | `loadUserInfo()` 改读缓存 |
| `SettingsViewModel.kt` | init 读缓存 + 后台刷新 |

## 错误处理

- 无源 → 直接跳主界面（Settings 添加源）
- 会员拉取失败 → 显示上次缓存或「VIP 未设置」
- refreshAll 失败 → 吞掉，不影响跳转
