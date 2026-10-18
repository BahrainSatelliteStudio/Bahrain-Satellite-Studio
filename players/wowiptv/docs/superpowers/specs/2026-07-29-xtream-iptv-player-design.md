# Xtream Codes IPTV Player — Design Spec

## Overview

An Android IPTV player app compatible with Xtream Codes API. Supports Live TV, VOD (Movies), and TV Series from multiple Xtream sources with EPG display and bottom bar navigation.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Kotlin |
| UI Framework | Jetpack Compose |
| Architecture | MVVM + Clean Architecture (data / domain / presentation) |
| Networking | Retrofit + OkHttp |
| Local Storage | Room (cache) + DataStore (source config) |
| DI | Hilt |
| Image Loading | Coil |
| Media Player | Media3 ExoPlayer |
| Navigation | Compose Navigation |

## Architecture

```
app/
├── data/
│   ├── remote/
│   │   └── xtream/
│   │       ├── XtreamApi.kt           # Retrofit interface
│   │       └── dto/                   # API response DTOs
│   ├── local/
│   │   ├── AppDatabase.kt            # Room database
│   │   ├── entity/                   # Room entities (cached data)
│   │   ├── dao/                      # Room DAOs
│   │   └── SourcePreferences.kt      # DataStore for source config
│   └── repository/                   # Repository implementations
├── domain/
│   ├── model/                        # Business entities (pure Kotlin)
│   ├── repository/                   # Repository interfaces
│   └── usecase/                      # Use cases
├── presentation/
│   ├── navigation/                   # NavGraph + routes
│   ├── main/                         # MainScreen + BottomBar
│   ├── live/                         # Live TV tab
│   ├── movies/                       # Movies tab
│   ├── series/                       # Series tab
│   ├── settings/                     # Settings tab + source management
│   ├── player/                       # Full-screen player
│   └── epg/                          # EPG timeline view
└── di/                               # Hilt modules
```

**Key rules:**
- `domain/` layer has zero Android framework dependencies (pure Kotlin)
- Each Xtream source is a `XtreamSource` entity. Only one source is active at a time
- `SourceProvider` (interface in domain, impl in data) provides current credentials
- Switching sources triggers a global reload across all ViewModels

## Data Layer

### Remote API (Retrofit)

Base URL is dynamically constructed from active source: `{serverUrl}:{port}/`

```kotlin
interface XtreamApi {
    // Auth + user/server info (no action param = default)
    @GET("player_api.php")
    suspend fun authenticate(
        @Query("username") u: String,
        @Query("password") p: String
    ): AuthResponse

    @GET("player_api.php")
    suspend fun getLiveCategories(
        @Query("username") u: String, @Query("password") p: String,
        @Query("action") action: String = "get_live_categories"
    ): List<LiveCategoryDto>

    @GET("player_api.php")
    suspend fun getLiveStreams(
        @Query("username") u: String, @Query("password") p: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: Int? = null
    ): List<LiveStreamDto>

    @GET("player_api.php")
    suspend fun getVodCategories(...): List<VodCategoryDto>

    @GET("player_api.php")
    suspend fun getVodStreams(...): List<VodStreamDto>

    @GET("player_api.php")
    suspend fun getVodInfo(
        @Query("vod_id") vodId: Int
    ): VodInfoDto

    @GET("player_api.php")
    suspend fun getSeriesCategories(...): List<SeriesCategoryDto>

    @GET("player_api.php")
    suspend fun getSeries(...): List<SeriesDto>

    @GET("player_api.php")
    suspend fun getSeriesInfo(
        @Query("series_id") seriesId: Int
    ): SeriesInfoDto

    @GET("player_api.php")
    suspend fun getShortEpg(
        @Query("stream_id") streamId: Int,
        @Query("limit") limit: Int = 4
    ): ShortEpgResponse
}
```

### Room Database

Tables:
- `source` — id, name, serverUrl, port, username, password, isActive
- `cached_live_category` — id, name, sourceId
- `cached_live_stream` — streamId, name, iconUrl, epgChannelId, categoryId, hasArchive, sourceId
- `cached_epg` — id, streamId, title, description, startTimestamp, endTimestamp, sourceId
- Similar tables for VOD categories, VOD streams, series categories, series

Cache strategy: show cached data immediately on app start, refresh from network in background. Pull-to-refresh forces network fetch.

### Repository Pattern

All repositories depend on `SourceProvider` (interface) to get current source credentials:

```kotlin
interface SourceProvider {
    fun getActiveSource(): Flow<XtreamSource?>
    suspend fun switchSource(sourceId: String)
}
```

## Domain Layer

### Key Models

```kotlin
data class XtreamSource(
    val id: String, val name: String, val serverUrl: String,
    val port: Int, val username: String, val password: String
)

data class LiveStream(
    val id: Int, val name: String, val iconUrl: String?,
    val epgChannelId: String?, val categoryId: Int, val hasArchive: Boolean
)

data class EPGEntry(
    val title: String, val description: String,
    val startTime: Long, val endTime: Long, val isNowPlaying: Boolean
)
// VOD, Series similar...
```

### Use Cases

- `GetLiveCategoriesUseCase` — returns categories for current source
- `GetLiveStreamsUseCase(categoryId?)` — returns streams (optionally filtered)
- `GetShortEpgUseCase(streamId)` — returns EPG entries for a channel
- `GetVodInfoUseCase(vodId)` — returns VOD detail
- `GetSeriesInfoUseCase(seriesId)` — returns seasons + episodes
- `SwitchSourceUseCase(sourceId)` — switches active source, clears cache
- `PlayStreamUseCase(streamId, type)` — generates playable URL
- `ManageSourcesUseCase` — CRUD operations on sources

### Stream URL Generation

```
Live:   {serverUrl}:{port}/live/{username}/{password}/{streamId}.ts
VOD:    {serverUrl}:{port}/movie/{username}/{password}/{streamId}.{ext}
Series: {serverUrl}:{port}/series/{username}/{password}/{streamId}.{ext}
```

## Presentation Layer

### Bottom Bar (4 tabs)

| Tab | Icon | Content |
|-----|------|---------|
| Live TV | 📺 | Category list → Channel list → Player / EPG |
| Movies | 🎬 | Category list → Movie list → Detail → Player |
| Series | 📺 | Category list → Series list → Seasons → Episodes → Player |
| Settings | ⚙️ | Source management (list, add, edit, delete, switch) |

### Navigation Graph

```
NavHost(startDestination = "main") {
    composable("main")                    // BottomBar scaffold
    composable("player/{streamType}/{streamId}")  // streamType: live/movie/series
    composable("epg/{streamId}")          // EPG timeline
    composable("vod/{vodId}")             // VOD detail
    composable("series/{seriesId}")       // Series detail (seasons+episodes)
    composable("source/add")              // Add source form
    composable("source/{id}/edit")        // Edit source form
}
```

### Screen States

Each ViewModel exposes a `UiState<T>`:
```kotlin
sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
    object Empty : UiState<Nothing>()
}
```

### Player Screen

- Full-screen ExoPlayer with Media3
- Controls: play/pause, seek bar, volume, aspect ratio toggle
- For Live: shows current/next EPG info overlay
- For VOD/Series: standard seek controls with chapter markers if available
- Hardware acceleration enabled for video decoding
- Auto-rotate to landscape on play

### EPG Display (dual mode)

1. **Integrated in Channel List** — each channel item shows:
   - Channel name + logo
   - Current program title (bold) + remaining time
   - Next program title + start time
   - Data: `get_short_epg` with limit=2

2. **EPG Timeline (dedicated page)** — accessible from channel list:
   - Horizontal scrollable timeline (past 2h → next 4h)
   - Vertical channel list (current category)
   - Red line at current time
   - Tap a program to see description or jump to channel
   - Data: `panel_api.php?action=get_epg&stream_id=X`

### Source Management (Settings)

- List all saved sources with active indicator
- Add: form with server URL, port (default 25461), username, password
- Edit: modify existing source
- Delete: confirm then remove
- Switch: tap to set as active source
- On switch: clear all caches for previous source, reload everything

## Data Flow Example (Live TV)

```
User opens Live tab
  → LiveViewModel.init()
  → GetLiveCategoriesUseCase()
  → XtreamRepository.getLiveCategories()
  → Check Room cache → show cached if available
  → Fetch from network → update Room → update UI

User taps category "Sports"
  → GetLiveStreamsUseCase(categoryId=1)
  → XtreamRepository.getLiveStreams(categoryId=1)
  → Show channel list with EPG info

User taps channel "ESPN"
  → PlayStreamUseCase(streamId=123)
  → Build URL: {source}/live/{user}/{pass}/123.ts
  → Navigate to player/{streamId}
  → ExoPlayer plays the stream
  → GetShortEpgUseCase(streamId=123) → overlay current/next
```

## Error Handling

- Network errors → fallback to Room cache → show toast "offline mode"
- Auth errors → show dialog "Invalid credentials for [source name]"
- Stream playback errors → ExoPlayer error callback → show retry button
- All ViewModels have a retry mechanism (pull-to-refresh or button)
- Loading: shimmer/skeleton placeholders for lists

## Non-Goals (for this first version)

- Timeshift / catch-up TV (TV Archive)
- Download / offline playback
- Multi-user profiles
- Parental controls
- Chromecast support
- PIP (Picture-in-Picture) mode
