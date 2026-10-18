# WowIPTV

> Lightweight Android IPTV player with Xtream Codes & M3U support, ready out of the box.

**English** ([README.md](README.md)) · [简体中文](README.zh-CN.md)

WowIPTV is an Android IPTV client supporting Live TV, on-demand Movies and TV Series, with EPG program guide, multi-source management and a bilingual (Chinese / English) interface. Built with Jetpack Compose, it features a dark gradient + frosted-glass UI tuned for everyday IPTV use.

## Features

- **Multi-source management** — maintain multiple Xtream / M3U sources, switch with one tap, sync individual or all sources
- **Live TV** — category browsing, channel search, favorites, EPG guide, real-time network speed
- **Movies (VOD)** — categories + search + favorites, resume playback, playback speed
- **Series** — seasons & episodes, watch progress, auto-play next episode
- **EPG guide** — timeline view, current/next program, portrait/landscape toggle
- **Player experience** — playback speed, audio track selection, volume gestures, refresh on stall, auto-resume after returning from background, vertical-swipe brightness/volume on left/right edge, live video resolution badge
- **Picture-in-Picture** — press Home or tap the PiP button during playback to keep watching in a floating window
- **Data management** — clear Continue Watching / history / favorites, image cache cleanup, cache re-sync
- **Version updates** — auto-check for the latest GitHub release on launch (toggleable), one-tap download & install
- **Bilingual UI** — Chinese / English, follow system, synced with Android 13+ per-app language
- **Customization** — default playback speed, player status bar toggle, home section visibility, startup preload, auto-check-for-updates toggle
- **Parental / category lock** — per-category lock on Live / Movies / Series with a management password; locked category content is hidden from the "All" view, favorites lists and the home page, and locks re-apply when you switch away
- **Visual style** — dark gradient background, brand glow, frosted cards, edge-to-edge status bar, 14 switchable theme colors
- **Tablet (PAD)** — responsive layout for landscape tablets: left NavigationRail (Settings pinned at bottom) + global top search bar; two-pane Live view (sidebar with category/sort/search/channels + player with EPG strip); Movies/Series with 4 sort modes and device-aware grid columns (2/3 phone, 6/8 tablet); detail pages with blurred hero backdrop; built-in Program Guide tab; two-column Settings

## Tech Stack

| Category | Choice |
|---|---|
| Language / UI | Kotlin · Jetpack Compose (Material 3) |
| Architecture | MVVM + Clean Architecture (data / domain / presentation) |
| Networking | Retrofit · OkHttp |
| Local storage | Room (content cache) · DataStore (source config & prefs) |
| Media playback | Media3 ExoPlayer |
| Image loading | Coil |
| DI | Hilt |
| Navigation | Navigation Compose |
| i18n | Android resources + appcompat AppLocales |

## Requirements

- minSdk 31 (Android 12+)
- targetSdk 36, compileSdk 37
- JDK 17
- AGP 9.2.1 · Kotlin 2.1.20

## Build

```bash
./gradlew.bat :app:assembleDebug   # Windows
./gradlew :app:assembleDebug       # macOS / Linux
```

The APK is generated at `app/build/outputs/apk/debug/`.

## Usage

1. Open the **Settings** tab after installing
2. Tap **Add Source**:
   - **Xtream**: name, server URL, port, username, password
   - **M3U**: name + M3U URL, or import a local `.m3u` file
3. Data syncs automatically; browse and play from Home / Live / Movies / Series tabs
4. Switch default source, language and player preferences from Settings

## Architecture

```
app/
├── data/
│   ├── remote/xtream/      # Retrofit API + DTOs
│   ├── local/              # Room entities / DAOs / DataStore prefs
│   ├── parser/             # M3U playlist parser
│   ├── repository/         # Repository implementations
│   └── di/                 # Hilt modules
├── domain/
│   ├── model/              # Business models
│   ├── repository/         # Repository interfaces
│   └── usecase/            # Use cases
└── presentation/
    ├── navigation/         # NavGraph + routes
    ├── main/               # Main scaffold + bottom bar
    ├── home/               # Home / Favorites / History / All items
    ├── live/               # Live TV + EPG
    ├── movies/             # Movies
    ├── series/             # Series
    ├── player/             # Player
    ├── epg/                # EPG timeline
    ├── settings/           # Settings & source management
    └── common/             # Theme / shared components
```

**Key conventions**

- The `domain` layer has zero Android dependencies (pure Kotlin)
- Exactly one source is active at a time; switching sources triggers a global data refresh
- Cached data is isolated per source (`sourceId`), so sources never pollute each other

## Disclaimer

- This app only provides playback functionality and bundles no channel or content sources
- Ensure the IPTV sources you use are properly licensed
- Use it in compliance with your local laws and regulations

## License

[MIT](LICENSE) © jack
