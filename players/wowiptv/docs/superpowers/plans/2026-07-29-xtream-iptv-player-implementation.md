# Xtream IPTV Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Android IPTV player compatible with Xtream Codes API, supporting Live TV + VOD + Series from multiple sources with EPG display.

**Architecture:** MVVM + Clean Architecture (data/domain/presentation layers). Single-Activity with Jetpack Compose UI. Hilt DI. Each Xtream source is a first-class entity with one active source at a time.

**Tech Stack:** Kotlin, Jetpack Compose, Hilt, Retrofit, Room, DataStore, Media3 ExoPlayer, Coil, Compose Navigation

## Global Constraints

- minSdk = 31, targetSdk = 36, compileSdk = 36 (release(36) minorApiLevel 1)
- Namespace: `com.dream.wowiptv`
- All new code in Kotlin under `app/src/main/java/com/dream/wowiptv/`
- Domain layer must have zero Android framework dependencies
- Each Xtream source stores: name, serverUrl, port, username, password
- Only one source active at a time; switching sources clears caches
- Stream URLs follow Xtream format: `{base}/live/{u}/{p}/{id}.ts`, `/movie/{u}/{p}/{id}.{ext}`, `/series/{u}/{p}/{id}.{ext}`

---

### Task 1: Project Scaffold

**Files:**
- Modify: `gradle/libs.versions.toml` — add all dependency versions and libraries
- Modify: `build.gradle.kts` — add plugin declarations
- Modify: `app/build.gradle.kts` — add Kotlin, Compose, Hilt, Room, all dependencies
- Modify: `app/src/main/AndroidManifest.xml` — add INTERNET permission, HiltApplication name
- Create: `app/src/main/java/com/dream/wowiptv/WowIPTVApp.kt`
- Create: `app/src/main/java/com/dream/wowiptv/MainActivity.kt`

**Interfaces:**
- Consumes: existing project scaffold (empty dirs, AndroidManifest, theme)
- Produces: `WowIPTVApp : Application`, `MainActivity : ComponentActivity`, compilable build config with all dependencies

- [ ] **Update `gradle/libs.versions.toml`**: add versions for kotlin, composeBom, hilt, room, retrofit, okhttp, med3, coil, datastore, navigation-compose, lifecycle. Add library entries and plugin entries for kotlin-android, kotlin-compose, hilt-android, ksp, room.

- [ ] **Update root `build.gradle.kts`**: add plugin aliases for kotlin-android, kotlin-compose, hilt-android, ksp, room (all `apply false`).

- [ ] **Update `app/build.gradle.kts`**: apply plugins (android, kotlin-android, kotlin-compose, hilt-android, ksp, room), enable compose `buildFeatures`, set `compileOptions` Java 17, add all dependencies from version catalog.

- [ ] **Update `AndroidManifest.xml`**: add `<uses-permission android:name="android.permission.INTERNET"/>`, add `android:name=".WowIPTVApp"` to `<application>`, add `android:usesCleartextTraffic="true"`.

- [ ] **Create `WowIPTVApp.kt`**: `@HiltAndroidApp class WowIPTVApp : Application()`

- [ ] **Create `MainActivity.kt`**: `@AndroidEntryPoint class MainActivity : ComponentActivity()`, setContent with a placeholder `Text("WowIPTV")`, enable edge-to-edge.

---

### Task 2: Domain Layer — Models, Interfaces, Use Cases

**Files:**
- Create: `domain/model/XtreamSource.kt`
- Create: `domain/model/LiveCategory.kt`
- Create: `domain/model/LiveStream.kt`
- Create: `domain/model/EpgEntry.kt`
- Create: `domain/model/VodCategory.kt`
- Create: `domain/model/VodStream.kt`
- Create: `domain/model/VodInfo.kt`
- Create: `domain/model/SeriesCategory.kt`
- Create: `domain/model/SeriesItem.kt`
- Create: `domain/model/SeriesInfo.kt`
- Create: `domain/model/Season.kt`
- Create: `domain/model/Episode.kt`
- Create: `domain/repository/SourceRepository.kt`
- Create: `domain/repository/LiveTvRepository.kt`
- Create: `domain/repository/VodRepository.kt`
- Create: `domain/repository/SeriesRepository.kt`
- Create: `domain/usecase/GetLiveCategoriesUseCase.kt`
- Create: `domain/usecase/GetLiveStreamsUseCase.kt`
- Create: `domain/usecase/GetShortEpgUseCase.kt`
- Create: `domain/usecase/SwitchSourceUseCase.kt`
- Create: `domain/usecase/GetVodCategoriesUseCase.kt`
- Create: `domain/usecase/GetVodStreamsUseCase.kt`
- Create: `domain/usecase/GetVodInfoUseCase.kt`
- Create: `domain/usecase/GetSeriesCategoriesUseCase.kt`
- Create: `domain/usecase/GetSeriesUseCase.kt`
- Create: `domain/usecase/GetSeriesInfoUseCase.kt`
- Create: `domain/usecase/ManageSourcesUseCase.kt`
- Create: `domain/usecase/PlayStreamUseCase.kt`

- [ ] **Create all domain models** (data classes, pure Kotlin, no annotations):
  - `XtreamSource(id, name, serverUrl, port, username, password)`
  - `LiveCategory(id, name)`, `LiveStream(id, name, iconUrl, epgChannelId, categoryId, hasArchive)`
  - `EpgEntry(title, description, startTime, endTime, isNowPlaying)`
  - `VodCategory(id, name)`, `VodStream(id, name, icon, rating, added, categoryId, containerExtension)`
  - `VodInfo(id, name, cover, backdropPath, plot, cast, director, genre, releasedate, durationSecs, rating, youtubeTrailer, categoryId)`
  - `SeriesCategory(id, name)`, `SeriesItem(id, name, cover, plot, cast, director, genre, rating, categoryId)`
  - `SeriesInfo(seasons: List<Season>, episodes: Map<Int, List<Episode>>, info: SeriesItem)`
  - `Season(id, seasonNumber, name, cover, episodeCount)`
  - `Episode(id, episodeNum, title, containerExtension, plot, releasedate, durationSecs)`

- [ ] **Create repository interfaces** (suspend functions, return Flow or domain models):
  - `SourceRepository`: fun getSources(): Flow<List<XtreamSource>>, fun getActiveSource(): Flow<XtreamSource?>, suspend fun addSource(...), suspend fun updateSource(...), suspend fun deleteSource(id), suspend fun switchSource(id)
  - `LiveTvRepository`: fun getCategories(): Flow<List<LiveCategory>>, fun getStreams(categoryId: Int?): Flow<List<LiveStream>>, fun getShortEpg(streamId: Int): Flow<List<EpgEntry>>, suspend fun refreshAll()
  - `VodRepository`: fun getCategories(): Flow<List<VodCategory>>, fun getStreams(categoryId: Int?): Flow<List<VodStream>>, suspend fun getInfo(vodId: Int): VodInfo, suspend fun refreshAll()
  - `SeriesRepository`: fun getCategories(): Flow<List<SeriesCategory>>, fun getSeries(categoryId: Int?): Flow<List<SeriesItem>>, suspend fun getInfo(seriesId: Int): SeriesInfo, suspend fun refreshAll()

- [ ] **Create use cases**: each is a class with `operator fun invoke(...)` that delegates to the repository. Use cases are injectable via Hilt `@Inject constructor`.
  - `GetLiveCategoriesUseCase(repo)`, `GetLiveStreamsUseCase(repo, categoryId)`, `GetShortEpgUseCase(repo, streamId)`
  - `SwitchSourceUseCase(sourceRepo, liveRepo, vodRepo, seriesRepo)`: calls sourceRepo.switchSource, then calls refreshAll on all content repos
  - `GetVodCategoriesUseCase(repo)`, `GetVodStreamsUseCase(repo, categoryId?)`, `GetVodInfoUseCase(repo, vodId)`
  - `GetSeriesCategoriesUseCase(repo)`, `GetSeriesUseCase(repo, categoryId?)`, `GetSeriesInfoUseCase(repo, seriesId)`
  - `ManageSourcesUseCase(repo)`: exposes sourceRepo CRUD directly
  - `PlayStreamUseCase(sourceRepo)`: returns a URL string for the given stream

---

### Task 3: Data Layer — Source Management & Dynamic Base URL

**Files:**
- Create: `data/local/SourcePreferences.kt`
- Create: `data/local/entity/SourceEntity.kt`
- Create: `data/local/dao/SourceDao.kt`
- Create: `data/local/AppDatabase.kt`
- Create: `data/remote/xtream/DynamicBaseUrlInterceptor.kt`
- Create: `data/repository/SourceRepositoryImpl.kt`

- [ ] **Create `SourceEntity`**: Room `@Entity(tableName = "sources")` with fields: `id` (auto-generated Long primary key), `name`, `serverUrl`, `port` (Int, default 25461), `username`, `password`, `isActive` (Boolean, default false).

- [ ] **Create `SourceDao`**: Room `@Dao` with `@Query("SELECT * FROM sources") fun getAll(): Flow<List<SourceEntity>>`, `@Query("SELECT * FROM sources WHERE isActive = 1 LIMIT 1") fun getActive(): Flow<SourceEntity?>`, `@Insert(onConflict = REPLACE) suspend fun insert(...)`, `@Update suspend fun update(...)`, `@Delete suspend fun delete(...)`, `@Query("UPDATE sources SET isActive = 0") suspend fun deactivateAll()`, `@Query("UPDATE sources SET isActive = 1 WHERE id = :id") suspend fun setActive(id: Long)`.

- [ ] **Create `SourcePreferences`**: uses `DataStore<Preferences>`, stores `activeSourceId: Flow<Long?>` and `setActiveSourceId(id: Long?)`.

- [ ] **Create `AppDatabase`**: `@Database(entities = [SourceEntity::class, ...], version = 1)` abstract class extending `RoomDatabase`. Provides abstract `SourceDao()`. Add other entities later.

- [ ] **Create `DynamicBaseUrlInterceptor`**: implements `Interceptor`. Reads `@Header("X-Dynamic-Base-Url")` or uses a `baseUrlProvider: () -> String` to rewrite the request URL at runtime. This allows Retrofit to use a dynamic base URL per source.

- [ ] **Create `SourceRepositoryImpl`**: implements `SourceRepository`. Uses `SourceDao` and `SourcePreferences`. Methods: `getSources()` delegates to DAO, `getActiveSource()` delegates to DAO, `addSource()` inserts and auto-activates if first source, `updateSource()` updates in Room, `deleteSource()` removes and auto-selects another if was active, `switchSource(id)` calls `deactivateAll()` then `setActive(id)`.

---

### Task 4: Data Layer — Xtream API Client & DTOs

**Files:**
- Create: `data/remote/NetworkResult.kt`
- Create: `data/remote/xtream/dto/AuthResponseDto.kt`
- Create: `data/remote/xtream/dto/LiveCategoryDto.kt`
- Create: `data/remote/xtream/dto/LiveStreamDto.kt`
- Create: `data/remote/xtream/dto/ShortEpgResponseDto.kt`
- Create: `data/remote/xtream/dto/VodCategoryDto.kt`
- Create: `data/remote/xtream/dto/VodStreamDto.kt`
- Create: `data/remote/xtream/dto/VodInfoDto.kt`
- Create: `data/remote/xtream/dto/SeriesCategoryDto.kt`
- Create: `data/remote/xtream/dto/SeriesDto.kt`
- Create: `data/remote/xtream/dto/SeriesInfoDto.kt`
- Create: `data/remote/xtream/XtreamApi.kt`

- [ ] **Create `NetworkResult<T>`**: sealed class with `Success(data: T)`, `Error(message: String, exception: Throwable?)`, `Loading`.

- [ ] **Create all DTOs**: data classes annotated with `@SerializedName` for JSON mapping. Match the Xtream Codes API response shapes exactly.
  - `AuthResponseDto`: `user_info` (auth, username, status, exp_date, max_connections, etc.) + `server_info` (url, port, https_port, etc.)
  - `LiveCategoryDto`: `category_id` (String), `category_name`, `parent_id`
  - `LiveStreamDto`: `num`, `name`, `stream_type`, `stream_id` (Int), `stream_icon`, `epg_channel_id`, `added`, `category_id`, `tv_archive`, `tv_archive_duration`
  - `ShortEpgResponseDto`: `epg_listings` (List of `EpgEntryDto` with `id`, `epg_id`, `title`, `lang`, `start`, `end`, `description`, `channel_id`, `start_timestamp`, `stop_timestamp`, `now_playing`, `has_archive`)
  - `VodCategoryDto`: `category_id`, `category_name`, `parent_id`
  - `VodStreamDto`: `num`, `name`, `stream_type`, `stream_id`, `stream_icon`, `rating`, `added`, `category_id`, `container_extension`
  - `VodInfoDto`: `info` (movie_image, tmdb_id, backdrop_path, youtube_trailer, genre, plot, cast, rating, director, releasedate, duration_secs, duration) + `movie_data` (stream_id, name, added, category_id, container_extension)
  - `SeriesCategoryDto`, `SeriesDto`, `SeriesInfoDto`: matching the API structure

- [ ] **Create `XtreamApi`**: Retrofit interface with all endpoints:
  - `@GET("player_api.php") suspend fun authenticate(@Query("username") u, @Query("password") p): AuthResponseDto`
  - `@GET("player_api.php") suspend fun getLiveCategories(@Query("username") u, @Query("password") p, @Query("action") action = "get_live_categories"): List<LiveCategoryDto>`
  - `@GET("player_api.php") suspend fun getLiveStreams(@Query("username") u, @Query("password") p, @Query("action") action = "get_live_streams", @Query("category_id") cid: Int? = null): List<LiveStreamDto>`
  - `@GET("player_api.php") suspend fun getShortEpg(@Query("username") u, @Query("password") p, @Query("action") action = "get_short_epg", @Query("stream_id") sid: Int, @Query("limit") limit: Int = 4): ShortEpgResponseDto`
  - `@GET("player_api.php") suspend fun getVodCategories(...): List<VodCategoryDto>`
  - `@GET("player_api.php") suspend fun getVodStreams(...): List<VodStreamDto>`
  - `@GET("player_api.php") suspend fun getVodInfo(@Query("vod_id") vid: Int): VodInfoDto`
  - `@GET("player_api.php") suspend fun getSeriesCategories(...): List<SeriesCategoryDto>`
  - `@GET("player_api.php") suspend fun getSeries(...): List<SeriesDto>`
  - `@GET("player_api.php") suspend fun getSeriesInfo(@Query("series_id") sid: Int): SeriesInfoDto`

---

### Task 5: Data Layer — Room Cache + Repository Implementations

**Files:**
- Create: `data/local/entity/LiveCategoryEntity.kt`
- Create: `data/local/entity/LiveStreamEntity.kt`
- Create: `data/local/entity/EpgEntity.kt`
- Create: `data/local/entity/VodCategoryEntity.kt`
- Create: `data/local/entity/VodStreamEntity.kt`
- Create: `data/local/entity/SeriesCategoryEntity.kt`
- Create: `data/local/entity/SeriesEntity.kt`
- Create: `data/local/entity/SeasonEntity.kt`
- Create: `data/local/entity/EpisodeEntity.kt`
- Create: `data/local/dao/LiveCategoryDao.kt`
- Create: `data/local/dao/LiveStreamDao.kt`
- Create: `data/local/dao/EpgDao.kt`
- Create: `data/local/dao/VodCategoryDao.kt`
- Create: `data/local/dao/VodStreamDao.kt`
- Create: `data/local/dao/SeriesCategoryDao.kt`
- Create: `data/local/dao/SeriesDao.kt`
- Modify: `data/local/AppDatabase.kt` — add all entities and DAOs
- Create: `data/repository/LiveTvRepositoryImpl.kt`
- Create: `data/repository/VodRepositoryImpl.kt`
- Create: `data/repository/SeriesRepositoryImpl.kt`
- Create: `data/mapper/DtoMappers.kt`

- [ ] **Create all cache entities**: each has a `sourceId` field (Long) to partition by source. Primary keys include sourceId for uniqueness across sources.

- [ ] **Create all DAOs**: standard `@Dao` interfaces with `@Query`, `@Insert(onConflict = REPLACE)`, `@Query("DELETE FROM ... WHERE sourceId = :sourceId")` for cache clearing.

- [ ] **Update `AppDatabase`**: add all entities to `@Database`, add all DAOs as abstract functions.

- [ ] **Create `DtoMappers.kt`**: extension functions to map DTO -> domain model and domain model -> Room entity.

- [ ] **Create `LiveTvRepositoryImpl`**: implements `LiveTvRepository`. 
  - `getCategories()`: returns Flow from Room, triggers network refresh if stale.
  - `getStreams(categoryId)`: same pattern.
  - `getShortEpg(streamId)`: same pattern.
  - `refreshAll()`: calls API, maps to entities, inserts into Room (with `sourceId` from SourceProvider).
  - Uses `SourceProvider` to get current credentials.

- [ ] **Create `VodRepositoryImpl`**: same pattern for VOD categories, streams, info.

- [ ] **Create `SeriesRepositoryImpl`**: same pattern for series categories, series list, series info (seasons + episodes).

---

### Task 6: DI Modules (after all data/domain types exist)

**Files:**
- Create: `app/src/main/java/com/dream/wowiptv/di/AppModule.kt`
- Create: `app/src/main/java/com/dream/wowiptv/di/NetworkModule.kt`
- Create: `app/src/main/java/com/dream/wowiptv/di/DatabaseModule.kt`
- Create: `app/src/main/java/com/dream/wowiptv/di/RepositoryModule.kt`

- [ ] **Create `AppModule.kt`**: `@Module @InstallIn(SingletonComponent::class)`, provides Gson, OkHttpClient (with logging interceptor, 30s timeouts). The OkHttpClient also gets `DynamicBaseUrlInterceptor` added.

- [ ] **Create `NetworkModule.kt`**: `@Module @InstallIn(SingletonComponent::class)`, provides `XtreamApi` Retrofit instance. Gets OkHttpClient injected, uses dynamic base URL via interceptor.

- [ ] **Create `DatabaseModule.kt`**: `@Module @InstallIn(SingletonComponent::class)`, provides `AppDatabase`, all DAOs (SourceDao, LiveCategoryDao, LiveStreamDao, EpgDao, VodCategoryDao, VodStreamDao, SeriesCategoryDao, SeriesDao).

- [ ] **Create `RepositoryModule.kt`**: `@Module @InstallIn(SingletonComponent::class)`, binds all Repository interfaces to their implementations. Binds: `SourceRepository` → `SourceRepositoryImpl`, `LiveTvRepository` → `LiveTvRepositoryImpl`, `VodRepository` → `VodRepositoryImpl`, `SeriesRepository` → `SeriesRepositoryImpl`.

---

### Task 7: UI Common — State, Theme, Components

**Files:**
- Create: `presentation/common/UiState.kt`
- Create: `presentation/common/theme/Theme.kt`
- Create: `presentation/common/theme/Color.kt`
- Create: `presentation/common/theme/Type.kt`
- Create: `presentation/common/components/LoadingIndicator.kt`
- Create: `presentation/common/components/ErrorView.kt`
- Create: `presentation/common/components/CategoryGrid.kt`
- Create: `presentation/common/components/StreamListItem.kt`
- Create: `presentation/common/components/EpgInfoBar.kt`

- [ ] **Create `UiState.kt`**: `sealed interface UiState<out T> { data object Loading : UiState<Nothing>; data class Success<T>(val data: T) : UiState<T>; data class Error(val message: String) : UiState<Nothing>; data object Empty : UiState<Nothing> }`

- [ ] **Create theming files**: dark IPTV-themed color palette (dark background, accent blue/red for live indicators), Material3 typography, `WowIPTVTheme` composable wrapping `MaterialTheme`.

- [ ] **Create `LoadingIndicator`**: centered `CircularProgressIndicator` with optional message text.

- [ ] **Create `ErrorView`**: centered error icon, message text, retry button.

- [ ] **Create `CategoryGrid`**: `LazyVerticalGrid` displaying category chips/cards, `onCategoryClick` callback. Used by Live, Movies, Series tabs.

- [ ] **Create `StreamListItem`**: row item showing icon (Coil async image), title, subtitle. For live, shows EPG current/next info. For VOD, shows rating/year. For series, shows episode count.

- [ ] **Create `EpgInfoBar`**: shows current program name + remaining time, and next program. Used in channel list items.

---

### Task 8: Navigation & Main Scaffold

**Files:**
- Create: `presentation/navigation/Routes.kt`
- Create: `presentation/navigation/BottomNavItem.kt`
- Create: `presentation/navigation/AppNavGraph.kt`
- Create: `presentation/main/MainScreen.kt`

- [ ] **Create `Routes.kt`**: object with route string constants: `MAIN`, `PLAYER/{streamType}/{streamId}`, `EPG/{streamId}`, `VOD/{vodId}`, `SERIES/{seriesId}`, `SOURCE_ADD`, `SOURCE_EDIT/{sourceId}`.

- [ ] **Create `BottomNavItem.kt`**: sealed class with 4 tabs: `Live("live", icon, "直播")`, `Movies("movies", icon, "电影")`, `Series("series", icon, "剧集")`, `Settings("settings", icon, "设置")`. Each has route, icon, label.

- [ ] **Create `MainScreen.kt`**: `@Composable fun MainScreen()` with `Scaffold` + `NavigationBar`. Contains `NavHost` for the 4 tab destinations (each loads its own screen composable). Uses `BottomNavItem` to build navigation items. Tab selection maps to nested navigation within each tab.

- [ ] **Create `AppNavGraph.kt`**: `@Composable fun AppNavGraph(navController: NavHostController)`. Defines the full nav graph: `composable("main") { MainScreen() }`, `composable("player/{streamType}/{streamId}") { PlayerScreen(...) }`, etc. Registered as the content of MainActivity.

---

### Task 9: Settings — Source Management UI

**Files:**
- Create: `presentation/settings/SettingsViewModel.kt`
- Create: `presentation/settings/SettingsScreen.kt`
- Create: `presentation/settings/SourceFormScreen.kt`

- [ ] **Create `SettingsViewModel`**: `@HiltViewModel`. Exposes `sources: StateFlow<UiState<List<XtreamSource>>>`, `activeSourceId: StateFlow<Long?>`. Functions: `addSource(name, url, port, user, pass)`, `updateSource(id, ...)`, `deleteSource(id)`, `switchSource(id)`. Uses `ManageSourcesUseCase` and `SwitchSourceUseCase`.

- [ ] **Create `SettingsScreen`**: shows list of sources with active indicator (green dot/badge). Each item has: name, server URL, username, active badge. Swipe-to-delete or delete icon. Tap to edit. "Add Source" FAB. Tap switch icon to set as active.

- [ ] **Create `SourceFormScreen`**: form with TextFields for name, server URL, port (default 25461), username, password (obscured). Save button. Used for both add and edit (pre-filled if editing). Validates non-empty fields. Shows loading state during save.

---

### Task 10: Live TV — Categories, Channels, EPG Bar

**Files:**
- Create: `presentation/live/LiveViewModel.kt`
- Create: `presentation/live/LiveScreen.kt`

- [ ] **Create `LiveViewModel`**: `@HiltViewModel`. Exposes `categories: StateFlow<UiState<List<LiveCategory>>>`, `selectedCategoryId: StateFlow<Int?>`, `streams: StateFlow<UiState<List<LiveStream>>>`, `epgMap: StateFlow<Map<Int, List<EpgEntry>>>`. Functions: `selectCategory(id?)`, `refresh()`, `onPlayStream(streamId)`. Uses `GetLiveCategoriesUseCase`, `GetLiveStreamsUseCase`, `GetShortEpgUseCase`.

- [ ] **Create `LiveScreen`**: 
  - Top: horizontally scrollable category chips. Selected chip highlighted.
  - Main: `LazyColumn` of channel items. Each item shows: channel icon (Coil), channel name, EPG info bar (current + next program). Tap opens player.
  - Each channel icon on the right has an EPG button to navigate to full timeline.
  - Pull-to-refresh support.
  - Empty state when no channels.

---

### Task 11: Player Screen

**Files:**
- Create: `presentation/player/PlayerViewModel.kt`
- Create: `presentation/player/PlayerScreen.kt`

- [ ] **Create `PlayerViewModel`**: `@HiltViewModel`. Takes `streamType` and `streamId` as savedStateHandle args. Exposes `streamUrl: StateFlow<String>`, `epgEntries: StateFlow<List<EpgEntry>>`, `isPlaying: StateFlow<Boolean>`. Functions: `play()`, `pause()`, `togglePlay()`. Uses `PlayStreamUseCase` to build URL. Uses `GetShortEpgUseCase` to load EPG overlay data (for live streams).

- [ ] **Create `PlayerScreen`**: 
  - Full-screen `AndroidView` wrapping `PlayerView` from Media3 UI library.
  - `@Composable fun PlayerScreen(streamType, streamId, onBack, navController)`.
  - On back press, release player and navigate back.
  - Overlay controls: top bar with back button + stream title, bottom controls with play/pause/seek.
  - For live streams: EPG info overlay showing current and next program.
  - Auto-hide controls after 3 seconds of inactivity.
  - Handle `DisposableEffect` for player lifecycle (initialize in LaunchedEffect, release in onDispose).

---

### Task 12: EPG Timeline Screen

**Files:**
- Create: `presentation/epg/EpgViewModel.kt`
- Create: `presentation/epg/EpgTimelineScreen.kt`

- [ ] **Create `EpgViewModel`**: `@HiltViewModel`. Takes `streamId` as savedStateHandle arg. Exposes `epgEntries: StateFlow<UiState<List<EpgEntry>>>`, `channelName: StateFlow<String>`. Uses `GetShortEpgUseCase` (with limit=0 for all, or panel_api endpoint).

- [ ] **Create `EpgTimelineScreen`**: 
  - Time grid: horizontal scrollable timeline. X-axis = time (2h past → 4h future), Y-axis = current source's live channels.
  - Uses `LazyColumn` for channels + horizontal scroll for time. Each cell is a program block with width proportional to duration.
  - Red vertical line at current time.
  - Current program highlighted.
  - Tap a program → show description in a bottom sheet or navigate to player at that channel.
  - Loading/error states handled.

---

### Task 13: Movies Tab

**Files:**
- Create: `presentation/movies/MoviesViewModel.kt`
- Create: `presentation/movies/MoviesScreen.kt`
- Create: `presentation/movies/MovieDetailScreen.kt`

- [ ] **Create `MoviesViewModel`**: `@HiltViewModel`. Exposes `categories`, `selectedCategoryId`, `streams: StateFlow<UiState<List<VodStream>>>`. Functions: `selectCategory(id?)`, `refresh()`. Uses `GetVodCategoriesUseCase`, `GetVodStreamsUseCase`.

- [ ] **Create `MoviesScreen`**: category chips at top + `LazyVerticalGrid` of movie posters (2 columns) below. Each poster: cover image (Coil), title overlay at bottom. Tap opens movie detail.

- [ ] **Create `MovieDetailScreen`**: shows cover image (large), title, year, rating, genre tags, plot, cast, director. Play button at bottom. Uses `GetVodInfoUseCase`.

---

### Task 14: Series Tab

**Files:**
- Create: `presentation/series/SeriesViewModel.kt`
- Create: `presentation/series/SeriesScreen.kt`
- Create: `presentation/series/SeriesDetailScreen.kt`

- [ ] **Create `SeriesViewModel`**: `@HiltViewModel`. Exposes `categories`, `selectedCategoryId`, `seriesList: StateFlow<UiState<List<SeriesItem>>>`. Functions: `selectCategory(id?)`, `refresh()`.

- [ ] **Create `SeriesScreen`**: category chips + lazy grid of series covers (like Netflix-style). Each shows cover image and title. Tap opens series detail.

- [ ] **Create `SeriesDetailScreen`**: shows series info (cover, plot, cast, rating), then a list of seasons (expandable). Each season shows its episodes with title, episode number. Tap episode → player. Uses `GetSeriesInfoUseCase`.

---

### Task 15: Wire Everything Together in MainActivity

**Files:**
- Modify: `presentation/main/MainScreen.kt` — integrate all tab screens
- Modify: `presentation/navigation/AppNavGraph.kt` — wire all detail routes
- Modify: `MainActivity.kt` — finalize with theme + nav graph

- [ ] **Update `MainScreen.kt`**: import and compose `LiveScreen()`, `MoviesScreen()`, `SeriesScreen()`, `SettingsScreen()` based on selected tab index. Pass `navController` for tab-internal navigation.

- [ ] **Update `AppNavGraph.kt`**: register all detail routes (`player/{streamType}/{streamId}`, `epg/{streamId}`, `vod/{vodId}`, `series/{seriesId}`, `source/add`, `source/{id}/edit`). Connect each to its screen composable.

- [ ] **Finalize `MainActivity.kt`**: wrap `AppNavGraph` in `WowIPTVTheme`. Enable edge-to-edge with `enableEdgeToEdge()`.

---

### Task 16: Build Verification

- [ ] **Run build**: `./gradlew assembleDebug` — ensure project compiles without errors.
- [ ] **Fix any compilation errors**: missing imports, type mismatches, unresolved references.
- [ ] **Final cleanup**: remove any placeholder files, verify theme consistency.
