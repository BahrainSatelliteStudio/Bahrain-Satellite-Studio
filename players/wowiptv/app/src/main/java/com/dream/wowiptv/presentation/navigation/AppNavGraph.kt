package com.dream.wowiptv.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.dream.wowiptv.presentation.epg.EpgTimelineScreen
import com.dream.wowiptv.presentation.home.AllFavoritesScreen
import com.dream.wowiptv.presentation.home.AllHistoryScreen
import com.dream.wowiptv.presentation.home.AllItemsScreen
import com.dream.wowiptv.presentation.main.MainScreen
import com.dream.wowiptv.presentation.movies.MovieDetailScreen
import com.dream.wowiptv.presentation.player.PlayerScreen
import com.dream.wowiptv.presentation.series.SeriesDetailScreen
import com.dream.wowiptv.presentation.settings.ManageCategoryLocksScreen
import com.dream.wowiptv.presentation.settings.SourceFormScreen
import com.dream.wowiptv.presentation.settings.SettingsScreen
import com.dream.wowiptv.presentation.search.GlobalSearchScreen
import com.dream.wowiptv.presentation.splash.SplashScreen

@Composable
fun AppNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        composable(Routes.SPLASH) {
            SplashScreen(
                onFinished = {
                    navController.navigate(Routes.mainRoute()) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Routes.MAIN,
            arguments = listOf(navArgument("liveStreamId") { type = NavType.IntType; defaultValue = -1 })
        ) { backStackEntry ->
            val liveStreamId = backStackEntry.arguments?.getInt("liveStreamId") ?: -1
            MainScreen(
                outerNavController = navController,
                pendingLiveStreamArg = if (liveStreamId >= 0) liveStreamId else null
            )
        }

        composable(
            route = Routes.PLAYER,
            arguments = listOf(
                navArgument("streamType") { type = NavType.StringType },
                navArgument("streamId") { type = NavType.StringType },
                navArgument("name") { type = NavType.StringType; defaultValue = "" },
                navArgument("position") { type = NavType.LongType; defaultValue = 0L },
                navArgument("episodes") { type = NavType.StringType; defaultValue = "" }
            )
        ) { backStackEntry ->
            val streamType = backStackEntry.arguments?.getString("streamType") ?: "live"
            val streamId = backStackEntry.arguments?.getString("streamId") ?: "0"
            val streamName = java.net.URLDecoder.decode(backStackEntry.arguments?.getString("name") ?: "", "UTF-8")
            val startPosition = backStackEntry.arguments?.getLong("position") ?: 0L
            PlayerScreen(
                streamType = streamType,
                streamId = streamId,
                streamName = streamName,
                startPosition = startPosition,
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.EPG,
            arguments = listOf(
                navArgument("streamId") { type = NavType.IntType }
            )
        ) {
            EpgTimelineScreen(
                onNavigateBack = { navController.popBackStack() },
                onPlayChannel = { streamId ->
                    navController.navigate(Routes.playerRoute("live", streamId.toString()))
                }
            )
        }

        composable(
            route = Routes.VOD,
            arguments = listOf(
                navArgument("vodId") { type = NavType.IntType }
            )
        ) {
            MovieDetailScreen(
                onBack = { navController.popBackStack() },
                onPlay = { vodId, name, position ->
                    navController.navigate(Routes.playerRoute("vod", vodId.toString(), name, position))
                }
            )
        }

        composable(
            route = Routes.SERIES,
            arguments = listOf(
                navArgument("seriesId") { type = NavType.IntType }
            )
        ) { backStackEntry ->
            val seriesId = backStackEntry.arguments?.getInt("seriesId") ?: 0
            SeriesDetailScreen(
                seriesId = seriesId,
                onBack = { navController.popBackStack() },
                onPlayEpisode = { episodeId, title, position, episodes ->
                    navController.navigate(Routes.playerRoute("series", episodeId, title, position, episodes))
                }
            )
        }

        composable(Routes.ALL_HISTORY) {
            AllHistoryScreen(
                onBack = { navController.popBackStack() },
                onMovieClick = { vodId ->
                    navController.navigate(Routes.vodRoute(vodId))
                },
                onSeriesClick = { seriesId ->
                    navController.navigate(Routes.seriesRoute(seriesId))
                },
                onLiveClick = { streamId, _ ->
                    navController.navigate(Routes.mainRoute(streamId))
                }
            )
        }

        composable(Routes.ALL_FAVORITES) {
            AllFavoritesScreen(
                onBack = { navController.popBackStack() },
                onMovieClick = { vodId ->
                    navController.navigate(Routes.vodRoute(vodId))
                },
                onSeriesClick = { seriesId ->
                    navController.navigate(Routes.seriesRoute(seriesId))
                },
                onLiveClick = { streamId, _ ->
                    navController.navigate(Routes.mainRoute(streamId))
                }
            )
        }

        composable(Routes.ALL_ITEMS,
            arguments = listOf(navArgument("tab") { type = NavType.IntType; defaultValue = 0 })
        ) { backStackEntry ->
            val tab = backStackEntry.arguments?.getInt("tab") ?: 0
            AllItemsScreen(
                initialTab = tab,
                onBack = { navController.popBackStack() },
                onMovieClick = { vodId ->
                    navController.navigate(Routes.vodRoute(vodId))
                },
                onSeriesClick = { seriesId ->
                    navController.navigate(Routes.seriesRoute(seriesId))
                },
                onLiveClick = { streamId, name ->
                    navController.navigate(Routes.mainRoute(streamId)) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.GLOBAL_SEARCH) {
            GlobalSearchScreen(
                onBack = { navController.popBackStack() },
                onMovieClick = { vodId ->
                    navController.navigate(Routes.vodRoute(vodId))
                },
                onSeriesClick = { seriesId ->
                    navController.navigate(Routes.seriesRoute(seriesId))
                },
                onLiveClick = { streamId, _ ->
                    navController.navigate(Routes.mainRoute(streamId)) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.SOURCE_ADD) {
            SourceFormScreen(onNavigateBack = { navController.popBackStack() })
        }

        composable(
            route = Routes.SOURCE_EDIT,
            arguments = listOf(
                navArgument("sourceId") { type = NavType.IntType }
            )
        ) { backStackEntry ->
            val sourceId = backStackEntry.arguments?.getInt("sourceId")?.toLong()
            SourceFormScreen(
                sourceId = sourceId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                onAddSource = { navController.navigate(Routes.SOURCE_ADD) },
                onEditSource = { sourceId -> navController.navigate(Routes.sourceEditRoute(sourceId.toInt())) },
                onManageLocks = { navController.navigate(Routes.MANAGE_LOCKS) }
            )
        }

        composable(Routes.MANAGE_LOCKS) {
            ManageCategoryLocksScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
