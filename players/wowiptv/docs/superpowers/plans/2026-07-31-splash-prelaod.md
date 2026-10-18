# Splash 页面与预加载 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 Splash 启动页，预加载会员信息与直播/电影/剧集计数后进入主界面。

**Architecture:** Splash 为导航图 start destination。`SplashViewModel` 并行执行：读本地 DB 计数（秒级）、`GetUserInfoUseCase` 拉会员信息存 `SourcePreferences` 缓存（3s 超时兜底）、后台 `refreshAll()` 预热 DB。完成后 `navigate(MAIN)`。Home/Settings 页读缓存消费。

**Tech Stack:** Kotlin, Jetpack Compose, Navigation, Hilt, Room, DataStore, Retrofit

**验证方式:** 无单元测试基础设施，每任务以 `./gradlew compileDebugKotlin` 编译通过验证。

---

### Task 1: SourcePreferences 新增会员信息缓存

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/data/local/SourcePreferences.kt`

- [ ] **Step 1: 添加 import 与缓存 key**

在 `SourcePreferences.kt` 顶部新增 import（保留已有）：

```kotlin
import androidx.datastore.preferences.core.stringPreferencesKey
import com.dream.wowiptv.domain.model.UserInfo
```

在 companion object 内 `ACTIVE_SOURCE_ID` 后新增：

```kotlin
private val USERNAME = stringPreferencesKey("user_info_username")
private val EXP_DATE = stringPreferencesKey("user_info_exp_date")
private val MAX_CONNECTIONS = stringPreferencesKey("user_info_max_connections")
private val ALLOWED_OUTPUT_FORMATS = stringPreferencesKey("user_info_allowed_output_formats")
```

- [ ] **Step 2: 新增 Flow 与 saveUserInfo**

在 `activeSourceId` 属性后新增：

```kotlin
val username: Flow<String?> = context.sourceDataStore.data.map { it[USERNAME] }

val expDate: Flow<String?> = context.sourceDataStore.data.map { it[EXP_DATE] }

val userInfo: Flow<UserInfo?> = context.sourceDataStore.data.map { p ->
    val name = p[USERNAME]
    if (name.isNullOrEmpty()) {
        null
    } else {
        UserInfo(
            username = name,
            expDate = p[EXP_DATE],
            maxConnections = p[MAX_CONNECTIONS],
            allowedOutputFormats = p[ALLOWED_OUTPUT_FORMATS]?.split(",")?.filter { it.isNotEmpty() }
        )
    }
}

suspend fun saveUserInfo(info: UserInfo) {
    context.sourceDataStore.edit { p ->
        p[USERNAME] = info.username ?: ""
        p[EXP_DATE] = info.expDate ?: ""
        p[MAX_CONNECTIONS] = info.maxConnections ?: ""
        p[ALLOWED_OUTPUT_FORMATS] = info.allowedOutputFormats?.joinToString(",") ?: ""
    }
}
```

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/data/local/SourcePreferences.kt
git commit -m "feat: SourcePreferences 新增会员信息缓存"
```

---

### Task 2: SplashViewModel

**Files:**
- Create: `app/src/main/java/com/dream/wowiptv/presentation/splash/SplashViewModel.kt`

- [ ] **Step 1: 创建 SplashViewModel**

```kotlin
package com.dream.wowiptv.presentation.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.data.local.SourcePreferences
import com.dream.wowiptv.data.local.dao.LiveStreamDao
import com.dream.wowiptv.data.local.dao.SeriesDao
import com.dream.wowiptv.data.local.dao.VodStreamDao
import com.dream.wowiptv.domain.repository.LiveTvRepository
import com.dream.wowiptv.domain.repository.SeriesRepository
import com.dream.wowiptv.domain.repository.SourceRepository
import com.dream.wowiptv.domain.repository.VodRepository
import com.dream.wowiptv.domain.usecase.GetUserInfoUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject

data class SplashCounts(
    val live: Int = 0,
    val movie: Int = 0,
    val series: Int = 0
)

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val sourceRepository: SourceRepository,
    private val liveStreamDao: LiveStreamDao,
    private val vodStreamDao: VodStreamDao,
    private val seriesDao: SeriesDao,
    private val liveTvRepository: LiveTvRepository,
    private val vodRepository: VodRepository,
    private val seriesRepository: SeriesRepository,
    private val getUserInfoUseCase: GetUserInfoUseCase,
    private val sourcePreferences: SourcePreferences
) : ViewModel() {

    private val _counts = MutableStateFlow<SplashCounts?>(null)
    val counts: StateFlow<SplashCounts?> = _counts.asStateFlow()

    private val _expiry = MutableStateFlow<String?>(null)
    val expiry: StateFlow<String?> = _expiry.asStateFlow()

    private val _ready = MutableStateFlow(false)
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    init {
        preload()
    }

    private fun preload() {
        viewModelScope.launch {
            val source = sourceRepository.getActiveSource().first()
            if (source == null) {
                _ready.value = true
                return@launch
            }

            _counts.value = SplashCounts(
                live = liveStreamDao.getBySource(source.id).first().size,
                movie = vodStreamDao.getBySource(source.id).first().size,
                series = seriesDao.getBySource(source.id).first().size
            )

            launch {
                val info = withTimeoutOrNull(3000) { getUserInfoUseCase() }
                if (info != null) {
                    sourcePreferences.saveUserInfo(info)
                    _expiry.value = formatExpiry(info.expDate)
                } else {
                    _expiry.value = formatExpiry(sourcePreferences.expDate.first())
                }
                _ready.value = true
            }

            launch {
                runCatching { liveTvRepository.refreshAll() }
                runCatching { vodRepository.refreshAll() }
                runCatching { seriesRepository.refreshAll() }
            }
        }
    }

    private fun formatExpiry(dateStr: String?): String {
        if (dateStr == null || dateStr.isBlank()) return ""
        val timestamp = dateStr.toLongOrNull()
        if (timestamp != null) {
            val cal = java.util.Calendar.getInstance().apply { timeInMillis = timestamp * 1000 }
            return "%04d-%02d-%02d".format(cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
        }
        return dateStr.take(10)
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 3: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/splash/SplashViewModel.kt
git commit -m "feat: SplashViewModel 预加载计数/会员信息/后台刷新"
```

---

### Task 3: SplashScreen

**Files:**
- Create: `app/src/main/java/com/dream/wowiptv/presentation/splash/SplashScreen.kt`

- [ ] **Step 1: 创建 SplashScreen**

```kotlin
package com.dream.wowiptv.presentation.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme

@Composable
fun SplashScreen(
    viewModel: SplashViewModel = hiltViewModel(),
    onFinished: () -> Unit
) {
    val counts by viewModel.counts.collectAsState()
    val expiry by viewModel.expiry.collectAsState()
    val ready by viewModel.ready.collectAsState()

    LaunchedEffect(ready) {
        if (ready) onFinished()
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        Box(
            modifier = Modifier.fillMaxSize().background(Color(0xFF1A1A1A)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Color(0xFF6366F1), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Movie,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "WowIPTV",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 28.sp
                )
                Spacer(modifier = Modifier.height(32.dp))
                CircularProgressIndicator(
                    color = Color(0xFF6366F1),
                    strokeWidth = 3.dp
                )
                Spacer(modifier = Modifier.height(32.dp))
                counts?.let {
                    Text(
                        text = "直播 ${it.live} · 电影 ${it.movie} · 剧集 ${it.series}",
                        color = Color(0xFF999999),
                        fontSize = 13.sp
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = if (expiry.isNullOrEmpty()) "VIP 加载中..." else "VIP 到期: $expiry",
                    color = Color(0xFF999999),
                    fontSize = 13.sp
                )
            }
        }
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 3: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/splash/SplashScreen.kt
git commit -m "feat: SplashScreen 预加载状态 UI"
```

---

### Task 4: 导航接入 Splash

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/navigation/Routes.kt:1-6`
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/navigation/AppNavGraph.kt:20-25`

- [ ] **Step 1: Routes 新增 SPLASH**

在 `Routes.kt` 顶部新增：

```kotlin
const val SPLASH = "splash"
```

- [ ] **Step 2: AppNavGraph 改 start destination 并新增 composable**

`AppNavGraph.kt` 中 `startDestination = Routes.MAIN` 改为 `startDestination = Routes.SPLASH`。

在 NavHost 第一个 composable（MAIN）前新增：

```kotlin
composable(Routes.SPLASH) {
    SplashScreen(
        onFinished = {
            navController.navigate(Routes.mainRoute()) {
                popUpTo(Routes.SPLASH) { inclusive = true }
            }
        }
    )
}
```

新增 import：`com.dream.wowiptv.presentation.splash.SplashScreen`

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/navigation/Routes.kt app/src/main/java/com/dream/wowiptv/presentation/navigation/AppNavGraph.kt
git commit -m "feat: 导航 start destination 改为 Splash"
```

---

### Task 5: HomeViewModel 会员信息读缓存

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/home/HomeViewModel.kt:55-78,171-178`

- [ ] **Step 1: 注入 SourcePreferences**

构造函数参数新增（在 `getUserInfoUseCase: GetUserInfoUseCase` 后）：

```kotlin
private val sourcePreferences: SourcePreferences,
```

新增 import：`import com.dream.wowiptv.data.local.SourcePreferences`

- [ ] **Step 2: loadUserInfo 改读缓存**

替换现有 `loadUserInfo()` 方法体：

```kotlin
private fun loadUserInfo() {
    viewModelScope.launch {
        val source = sourceRepository.getActiveSource().first()
        val expiry = sourcePreferences.expDate.first()
        _data.value = _data.value.copy(
            username = source?.username ?: "",
            expiryDate = formatExpiry(expiry)
        )
    }
}
```

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/home/HomeViewModel.kt
git commit -m "refactor: Home 会员信息改读 SourcePreferences 缓存"
```

---

### Task 6: SettingsViewModel 缓存 + 后台刷新

**Files:**
- Modify: `app/src/main/java/com/dream/wowiptv/presentation/settings/SettingsViewModel.kt:24-47`

- [ ] **Step 1: 注入 SourcePreferences**

构造函数参数新增（在 `getUserInfoUseCase: GetUserInfoUseCase` 后）：

```kotlin
private val sourcePreferences: SourcePreferences,
```

新增 import：`import com.dream.wowiptv.data.local.SourcePreferences`
新增 import：`import kotlinx.coroutines.flow.first`

- [ ] **Step 2: init 读缓存，refreshUserInfo 成功后存缓存**

替换 `init` 块与 `refreshUserInfo()`：

```kotlin
init {
    viewModelScope.launch {
        val cached = sourcePreferences.userInfo.first()
        if (cached != null) _userInfo.value = cached
        refreshUserInfo()
    }
}

fun refreshUserInfo() {
    viewModelScope.launch {
        val result = getUserInfoUseCase()
        if (result != null) {
            _userInfo.value = result
            sourcePreferences.saveUserInfo(result)
        }
    }
}
```

- [ ] **Step 3: 编译验证**

Run: `./gradlew compileDebugKotlin -q`
Expected: 无输出（成功）

- [ ] **Step 4: 提交**

```bash
git add app/src/main/java/com/dream/wowiptv/presentation/settings/SettingsViewModel.kt
git commit -m "refactor: 设置页会员信息先读缓存再后台刷新"
```

---

### Task 7: 全量验证

**Files:**
- 无改动

- [ ] **Step 1: 完整编译**

Run: `./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: 确认文件清单**

验证以下文件存在且包含预期代码：
- `presentation/splash/SplashScreen.kt`
- `presentation/splash/SplashViewModel.kt`
- `Routes.SPLASH` 已定义并被 AppNavGraph 引用
- `SourcePreferences` 含 `saveUserInfo`/`userInfo`
- `HomeViewModel.loadUserInfo()` 读 `sourcePreferences`
- `SettingsViewModel` init 读缓存

- [ ] **Step 3: 提交（如有遗漏改动）**

```bash
git status
```
若无未提交改动则跳过。
