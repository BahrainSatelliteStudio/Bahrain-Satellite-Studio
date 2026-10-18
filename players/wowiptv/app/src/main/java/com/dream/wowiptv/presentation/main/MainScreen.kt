package com.dream.wowiptv.presentation.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.dream.wowiptv.presentation.home.HomeScreen
import com.dream.wowiptv.presentation.epg.EpgTimelineScreen
import com.dream.wowiptv.presentation.live.LiveScreen
import com.dream.wowiptv.presentation.movies.MoviesScreen
import com.dream.wowiptv.presentation.navigation.BottomNavItem
import com.dream.wowiptv.presentation.navigation.Routes
import com.dream.wowiptv.presentation.series.SeriesScreen
import com.dream.wowiptv.presentation.settings.SettingsScreen
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import com.dream.wowiptv.presentation.common.SourceTypeViewModel
import com.dream.wowiptv.presentation.update.UpdateCheckDialog
import com.dream.wowiptv.presentation.update.UpdateState
import com.dream.wowiptv.presentation.update.UpdateViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import com.dream.wowiptv.BuildConfig
import com.dream.wowiptv.R

private const val PROGRAM_GUIDE = "program_guide"

@Composable
fun MainScreen(outerNavController: NavHostController, pendingLiveStreamArg: Int? = null) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    var hideBottomBar by remember { mutableStateOf(false) }
    var pendingLiveStream by remember { mutableStateOf(pendingLiveStreamArg) }
    val sourceTypeViewModel: SourceTypeViewModel = hiltViewModel()
    val sourceType by sourceTypeViewModel.sourceType.collectAsState()
    val updateViewModel: UpdateViewModel = hiltViewModel()
    val updateState by updateViewModel.state.collectAsState()
    val autoCheckUpdate by updateViewModel.autoCheckUpdate.collectAsState()

    val accent = LocalAccentPalette.current

    val isTablet = rememberIsTablet()
    val visibleItems = if (sourceType == "m3u") {
        BottomNavItem.items.filter {
            it.route != BottomNavItem.Movies.route && it.route != BottomNavItem.Series.route
        }
    } else {
        BottomNavItem.items
    }

    LaunchedEffect(Unit) {
        if (autoCheckUpdate) updateViewModel.check()
    }

    LaunchedEffect(sourceType) {
        if (sourceType == "m3u" &&
            currentRoute in listOf(BottomNavItem.Movies.route, BottomNavItem.Series.route)
        ) {
            navController.navigate(BottomNavItem.Home.route) {
                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    LaunchedEffect(pendingLiveStreamArg) {
        if (pendingLiveStreamArg != null) {
            navController.navigate(BottomNavItem.Live.route) {
                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    Scaffold(
        containerColor = Color(0xFF1A1A1A),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            if (isTablet && !hideBottomBar) {
                TabletTopBar(onOpenSearch = { outerNavController.navigate(Routes.GLOBAL_SEARCH) })
            }
        },
        bottomBar = {
            if (!hideBottomBar && !isTablet) {
                MaterialTheme(colorScheme = DarkColorScheme) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF1A1A1A))
                            .navigationBarsPadding()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(
                                            Color.Transparent,
                                            accent.primary.copy(alpha = 0.6f),
                                            Color.Transparent
                                        )
                                    )
                                )
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp)
                        ) {
                            visibleItems.forEach { item ->
                                val selected = currentRoute == item.route
                                val itemColor = if (selected) accent.vibrant else Color(0xFF8A8A93)
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                        .clickable {
                                            navController.navigate(item.route) {
                                                popUpTo(navController.graph.findStartDestination().id) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        },
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = item.icon,
                                        contentDescription = stringResource(item.labelRes),
                                        tint = itemColor,
                                        modifier = Modifier.size(22.dp)
                                    )
                                    Spacer(modifier = Modifier.height(3.dp))
                                    Text(
                                        text = stringResource(item.labelRes),
                                        color = itemColor,
                                        fontSize = 10.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Row(modifier = Modifier.padding(innerPadding)) {
            if (isTablet && !hideBottomBar) {
                TabletNavigationRail(
                    items = visibleItems,
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            NavHost(
                navController = navController,
                startDestination = BottomNavItem.Home.route,
                modifier = Modifier.weight(1f)
            ) {
            composable(
                route = BottomNavItem.Home.route,
                enterTransition = null,
                exitTransition = null
            ) {
                HomeScreen(
                    onMovieClick = { vodId ->
                        outerNavController.navigate(Routes.vodRoute(vodId))
                    },
                    onSeriesClick = { seriesId ->
                        outerNavController.navigate(Routes.seriesRoute(seriesId))
                    },
                    onLiveClick = { streamId, name ->
                        pendingLiveStream = streamId
                        navController.navigate(BottomNavItem.Live.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onViewAllFavorites = {
                        outerNavController.navigate(Routes.ALL_FAVORITES)
                    },
                    onViewAllRecent = {
                        outerNavController.navigate(Routes.allItemsRoute(0))
                    },
                    onViewAllHistory = {
                        outerNavController.navigate(Routes.ALL_HISTORY)
                    },
                    onOpenLive = {
                        navController.navigate(BottomNavItem.Live.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onOpenMovies = {
                        navController.navigate(BottomNavItem.Movies.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onOpenSeries = {
                        navController.navigate(BottomNavItem.Series.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onOpenSearch = {
                        outerNavController.navigate(Routes.GLOBAL_SEARCH)
                    }
                )
            }
            composable(
                route = BottomNavItem.Live.route,
                enterTransition = null,
                exitTransition = null
            ) {
                LiveScreen(
                    pendingStreamId = pendingLiveStream,
                    onStreamPlayed = { pendingLiveStream = null },
                    onFullscreenChanged = { fullscreen ->
                        hideBottomBar = fullscreen
                    },
                    onOpenEpg = { streamId ->
                        outerNavController.navigate(Routes.epgRoute(streamId))
                    }
                )
            }
            composable(
                route = BottomNavItem.Movies.route,
                enterTransition = null,
                exitTransition = null
            ) {
                MoviesScreen(
                    onMovieClick = { vodId ->
                        outerNavController.navigate(Routes.vodRoute(vodId))
                    }
                )
            }
            composable(
                route = BottomNavItem.Series.route,
                enterTransition = null,
                exitTransition = null
            ) {
                SeriesScreen(
                    onSeriesClick = { seriesId ->
                        outerNavController.navigate(Routes.seriesRoute(seriesId))
                    }
                )
            }
            composable(
                route = BottomNavItem.Settings.route,
                enterTransition = null,
                exitTransition = null
            ) {
                SettingsScreen(
                    onAddSource = { outerNavController.navigate(Routes.SOURCE_ADD) },
                    onEditSource = { sourceId -> outerNavController.navigate(Routes.sourceEditRoute(sourceId.toInt())) },
                    onManageLocks = { outerNavController.navigate(Routes.MANAGE_LOCKS) }
                )
            }
            composable(
                route = PROGRAM_GUIDE,
                enterTransition = null,
                exitTransition = null
            ) {
                if (isTablet) {
                    EpgTimelineScreen(
                        onNavigateBack = {},
                        onPlayChannel = { streamId ->
                            outerNavController.navigate(Routes.playerRoute("live", streamId.toString()))
                        },
                        embedded = true
                    )
                }
            }
            }
        }
    }

    val autoPrompt = updateState is UpdateState.Available ||
        updateState is UpdateState.Downloading ||
        updateState is UpdateState.Downloaded ||
        updateState is UpdateState.Error
    if (autoPrompt) {
        UpdateCheckDialog(
            state = updateState,
            currentVersion = BuildConfig.VERSION_NAME,
            onDismiss = { updateViewModel.dismiss() },
            onDownload = { updateViewModel.download() },
            onInstall = { updateViewModel.install() },
            onRetry = { updateViewModel.check() }
        )
    }
}

@Composable
private fun TabletTopBar(onOpenSearch: () -> Unit) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1A1A1A))
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "WowIPTV",
            style = TextStyle(
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                brush = Brush.linearGradient(listOf(accent.light, accent.dark))
            )
        )
        Spacer(modifier = Modifier.width(24.dp))
        Surface(
            modifier = Modifier
                .weight(1f)
                .height(44.dp)
                .clip(RoundedCornerShape(22.dp))
                .clickable(onClick = onOpenSearch),
            color = Color(0xFF2D2D3A)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = Color(0xFF8A8A93),
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.common_search),
                    color = Color(0xFF8A8A93),
                    fontSize = 14.sp
                )
            }
        }
        Spacer(modifier = Modifier.width(24.dp))
    }
}

@Composable
private fun TabletNavigationRail(
    items: List<BottomNavItem>,
    currentRoute: String?,
    onNavigate: (String) -> Unit
) {
    val accent = LocalAccentPalette.current
    NavigationRail(
        containerColor = Color(0xFF1A1A1A),
        modifier = Modifier.fillMaxHeight()
    ) {
        items.filter { it != BottomNavItem.Settings }.forEach { item ->
            val selected = currentRoute == item.route
            NavigationRailItem(
                selected = selected,
                onClick = { onNavigate(item.route) },
                icon = { Icon(item.icon, contentDescription = stringResource(item.labelRes)) },
                label = { Text(stringResource(item.labelRes)) },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = accent.vibrant,
                    selectedTextColor = accent.vibrant,
                    indicatorColor = accent.primary.copy(alpha = 0.25f),
                    unselectedIconColor = Color(0xFF8A8A93),
                    unselectedTextColor = Color(0xFF8A8A93)
                )
            )
        }
        NavigationRailItem(
            selected = currentRoute == PROGRAM_GUIDE,
            onClick = { onNavigate(PROGRAM_GUIDE) },
            icon = {
                Icon(
                    Icons.Filled.DateRange,
                    contentDescription = stringResource(R.string.program_guide)
                )
            },
            label = { Text(stringResource(R.string.program_guide)) },
            colors = NavigationRailItemDefaults.colors(
                selectedIconColor = accent.vibrant,
                selectedTextColor = accent.vibrant,
                indicatorColor = accent.primary.copy(alpha = 0.25f),
                unselectedIconColor = Color(0xFF8A8A93),
                unselectedTextColor = Color(0xFF8A8A93)
            )
        )
        Spacer(modifier = Modifier.weight(1f))
        val settingsSelected = currentRoute == BottomNavItem.Settings.route
        NavigationRailItem(
            selected = settingsSelected,
            onClick = { onNavigate(BottomNavItem.Settings.route) },
            icon = { Icon(BottomNavItem.Settings.icon, contentDescription = stringResource(BottomNavItem.Settings.labelRes)) },
            label = { Text(stringResource(BottomNavItem.Settings.labelRes)) },
            colors = NavigationRailItemDefaults.colors(
                selectedIconColor = accent.vibrant,
                selectedTextColor = accent.vibrant,
                indicatorColor = accent.primary.copy(alpha = 0.25f),
                unselectedIconColor = Color(0xFF8A8A93),
                unselectedTextColor = Color(0xFF8A8A93)
            )
        )
    }
}
