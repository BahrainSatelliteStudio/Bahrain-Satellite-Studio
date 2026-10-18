package com.dream.wowiptv.presentation.settings

import android.app.Activity
import android.content.Context
import android.widget.Toast
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TextButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.imageLoader
import com.dream.wowiptv.R
import com.dream.wowiptv.BuildConfig
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.presentation.common.SourceTypeViewModel
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.rememberIsTablet
import com.dream.wowiptv.presentation.common.effectiveGridColumns
import com.dream.wowiptv.presentation.update.UpdateCheckDialog
import com.dream.wowiptv.presentation.update.UpdateState
import com.dream.wowiptv.presentation.update.UpdateViewModel
import com.dream.wowiptv.presentation.common.components.ErrorView
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import com.dream.wowiptv.presentation.common.theme.SuccessGreen
import com.dream.wowiptv.presentation.common.theme.ThemeAccent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onAddSource: () -> Unit,
    onEditSource: (Long) -> Unit,
    onManageLocks: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel(),
    sourceTypeViewModel: SourceTypeViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val sourcesState by viewModel.sources.collectAsStateWithLifecycle()
    val activeSourceId by viewModel.activeSourceId.collectAsStateWithLifecycle()
    val syncingIds by viewModel.syncingIds.collectAsStateWithLifecycle()
    val syncingAll by viewModel.syncingAll.collectAsState()
    val clearingCache by viewModel.clearingCache.collectAsState()
    val refreshingUser by viewModel.refreshingUser.collectAsState()
    val userInfo by viewModel.userInfo.collectAsStateWithLifecycle()
    val sourceType by sourceTypeViewModel.sourceType.collectAsState()

    val defaultSpeed by viewModel.defaultPlaybackSpeed.collectAsState()
    val showPlayerStatus by viewModel.showPlayerStatus.collectAsState()
    val autoplayNext by viewModel.autoplayNextEpisode.collectAsState()
    val showContinue by viewModel.showContinueWatching.collectAsState()
    val showFavorites by viewModel.showFavorites.collectAsState()
    val showRecent by viewModel.showRecent.collectAsState()
    val splashPreload by viewModel.splashPreload.collectAsState()
    val showCastAvatars by viewModel.showCastAvatars.collectAsState()
    val tmdbApiKey by viewModel.tmdbApiKey.collectAsState()
    val themeColor by viewModel.themeColor.collectAsState()
    val gridColumns by viewModel.contentGridColumns.collectAsState()
    val posterContentScale by viewModel.posterContentScale.collectAsState()
    val lockPassword by viewModel.categoryLockPassword.collectAsState()
    val updateViewModel: UpdateViewModel = hiltViewModel()
    val updateState by updateViewModel.state.collectAsState()
    val autoCheckUpdate by updateViewModel.autoCheckUpdate.collectAsState()

    val accent = LocalAccentPalette.current

    val isTablet = rememberIsTablet()
    var selectedGroup by remember { mutableIntStateOf(0) }
    val groups = listOf(
        R.string.settings_general_section,
        R.string.settings_player_section,
        R.string.settings_home_section,
        R.string.settings_startup_section,
        R.string.settings_data_section,
        R.string.settings_lock_section,
        R.string.settings_sources,
        R.string.settings_about
    )

    val prevSyncingIdsState = remember { mutableStateOf<Set<Long>>(emptySet()) }
    val currentSyncingIds by rememberUpdatedState(syncingIds)

    LaunchedEffect(currentSyncingIds) {
        val newlyCompleted = prevSyncingIdsState.value - currentSyncingIds
        if (newlyCompleted.isNotEmpty() && prevSyncingIdsState.value.isNotEmpty()) {
            Toast.makeText(context, context.getString(R.string.settings_sync_done), Toast.LENGTH_SHORT).show()
        }
        prevSyncingIdsState.value = currentSyncingIds
    }

    val scope = rememberCoroutineScope()
    var cacheSize by remember { mutableStateOf(0L) }
    val imageLoader = remember { context.imageLoader }
    var showTmdbKeyDialog by remember { mutableStateOf(false) }
    var tmdbKeyInput by remember { mutableStateOf("") }
    var showLockPasswordDialog by remember { mutableStateOf(false) }
    var lockPasswordInput by remember { mutableStateOf("") }

    fun refreshCacheSize() {
        scope.launch(Dispatchers.IO) {
            cacheSize = imageLoader.diskCache?.size ?: 0L
        }
    }

    @OptIn(coil.annotation.ExperimentalCoilApi::class)
    fun clearImageCache() {
        imageLoader.memoryCache?.clear()
        imageLoader.diskCache?.clear()
        refreshCacheSize()
    }

    LaunchedEffect(Unit) { refreshCacheSize() }

    val generalSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_general_section), icon = Icons.Default.Settings) {
            LanguageRow()
            HorizontalDividerItem()
            ThemeColorRow(
                selected = themeColor,
                onSelect = viewModel::setThemeColor
            )
            HorizontalDividerItem()
            GridColumnsRow(
                selected = effectiveGridColumns(gridColumns, isTablet),
                onSelect = viewModel::setContentGridColumns,
                isTablet = isTablet
            )
            HorizontalDividerItem()
            PosterScaleRow(
                selected = posterContentScale,
                onSelect = viewModel::setPosterContentScale
            )
            HorizontalDividerItem()
            SettingSwitchRow(
                title = stringResource(R.string.settings_show_avatars),
                subtitle = stringResource(R.string.settings_show_avatars_desc),
                checked = showCastAvatars,
                onCheckedChange = viewModel::setShowCastAvatars
            )
            if (showCastAvatars) {
                TmdbKeyRow(
                    key = tmdbApiKey,
                    onEdit = {
                        tmdbKeyInput = tmdbApiKey
                        showTmdbKeyDialog = true
                    }
                )
            }
        }
    }
    val playerSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_player_section), icon = Icons.Default.Speed) {
            PlaybackSpeedRow(
                selected = defaultSpeed,
                onSelect = viewModel::setDefaultPlaybackSpeed
            )
            SettingSwitchRow(
                title = stringResource(R.string.settings_player_status),
                subtitle = stringResource(R.string.settings_player_status_desc),
                checked = showPlayerStatus,
                onCheckedChange = viewModel::setShowPlayerStatus
            )
            SettingSwitchRow(
                title = stringResource(R.string.settings_autoplay),
                subtitle = stringResource(R.string.settings_autoplay_desc),
                checked = autoplayNext,
                onCheckedChange = viewModel::setAutoplayNextEpisode
            )
        }
    }
    val homeSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_home_section), icon = Icons.Default.Home) {
            SettingSwitchRow(
                title = stringResource(R.string.settings_show_continue),
                subtitle = stringResource(R.string.settings_show_continue_desc),
                checked = showContinue,
                onCheckedChange = viewModel::setShowContinueWatching
            )
            SettingSwitchRow(
                title = stringResource(R.string.settings_show_favorites),
                subtitle = stringResource(R.string.settings_show_favorites_desc),
                checked = showFavorites,
                onCheckedChange = viewModel::setShowFavorites
            )
            SettingSwitchRow(
                title = stringResource(R.string.settings_show_recent),
                subtitle = stringResource(R.string.settings_show_recent_desc),
                checked = showRecent,
                onCheckedChange = viewModel::setShowRecent
            )
        }
    }
    val startupSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_startup_section), icon = Icons.Default.Info) {
            SettingSwitchRow(
                title = stringResource(R.string.settings_splash_preload),
                subtitle = stringResource(R.string.settings_splash_preload_desc),
                checked = splashPreload,
                onCheckedChange = viewModel::setSplashPreload
            )
        }
    }
    val dataSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_data_section), icon = Icons.Default.DeleteSweep) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.settings_image_cache), style = MaterialTheme.typography.bodyLarge, color = Color.White)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(stringResource(R.string.settings_image_cache_usage, formatCacheSize(cacheSize)), style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
                }
                Text(
                    text = stringResource(R.string.settings_clear),
                    color = accent.primary,
                    modifier = Modifier
                        .clickable {
                            clearImageCache()
                            Toast.makeText(context, context.getString(R.string.settings_image_cache_cleared), Toast.LENGTH_SHORT).show()
                        }
                        .padding(8.dp)
                )
            }
            HorizontalDividerItem()
            ActionRow(
                title = stringResource(R.string.settings_clear_history),
                subtitle = stringResource(R.string.settings_clear_history_desc),
                enabled = true,
                onClick = {
                    viewModel.clearHistory()
                    Toast.makeText(context, context.getString(R.string.settings_history_cleared), Toast.LENGTH_SHORT).show()
                }
            )
            HorizontalDividerItem()
            ActionRow(
                title = stringResource(R.string.settings_clear_favorites),
                subtitle = stringResource(R.string.settings_clear_favorites_desc),
                enabled = true,
                onClick = {
                    viewModel.clearFavorites()
                    Toast.makeText(context, context.getString(R.string.settings_favorites_cleared), Toast.LENGTH_SHORT).show()
                }
            )
            HorizontalDividerItem()
            ActionRow(
                title = stringResource(R.string.settings_clear_cache_resync),
                subtitle = stringResource(R.string.settings_clear_cache_resync_desc),
                enabled = !clearingCache,
                loading = clearingCache,
                onClick = {
                    viewModel.clearCacheAndResync()
                    Toast.makeText(context, context.getString(R.string.settings_cache_cleared_syncing), Toast.LENGTH_LONG).show()
                }
            )
        }
    }
    val lockSection: @Composable () -> Unit = {
        SectionCard(title = stringResource(R.string.settings_lock_section), icon = Icons.Default.Lock) {
            ActionRow(
                title = stringResource(R.string.settings_lock_password),
                subtitle = if (lockPassword.isNotEmpty()) stringResource(R.string.settings_lock_password_set) else stringResource(R.string.settings_lock_password_not_set),
                enabled = true,
                onClick = {
                    lockPasswordInput = lockPassword
                    showLockPasswordDialog = true
                }
            )
            HorizontalDividerItem()
            ActionRow(
                title = stringResource(R.string.settings_lock_manage),
                subtitle = stringResource(R.string.settings_lock_manage_desc),
                enabled = true,
                onClick = {
                    if (lockPassword.isEmpty()) {
                        lockPasswordInput = ""
                        showLockPasswordDialog = true
                    } else {
                        onManageLocks()
                    }
                }
            )
        }
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
        Scaffold(
            topBar = {
                if (!isTablet) {
                    TopAppBar(
                        title = { Text(stringResource(R.string.settings_title)) },
                        windowInsets = WindowInsets.statusBars,
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.Transparent,
                            titleContentColor = Color.White
                        )
                    )
                }
            },
            containerColor = Color.Transparent
        ) { innerPadding ->
            if (isTablet) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    Column(
                        modifier = Modifier
                            .width(200.dp)
                            .fillMaxHeight()
                            .verticalScroll(rememberScrollState())
                            .padding(vertical = 16.dp)
                    ) {
                        groups.forEachIndexed { index, titleRes ->
                            val selected = index == selectedGroup
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (selected) accent.primary.copy(alpha = 0.22f) else Color.Transparent
                                    )
                                    .clickable { selectedGroup = index }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = stringResource(titleRes),
                                    color = if (selected) accent.vibrant else Color(0xFFCCCCCC),
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                    VerticalDivider(color = Color.White.copy(alpha = 0.1f))
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .verticalScroll(remember(selectedGroup) { ScrollState(0) })
                            .padding(16.dp)
                    ) {
                        when (selectedGroup) {
                            0 -> {
                                if (sourceType == "xtream") {
                                    UserInfoCard(
                                        userInfo = userInfo,
                                        refreshing = refreshingUser,
                                        onRefresh = {
                                            viewModel.refreshUserInfo()
                                            Toast.makeText(context, context.getString(R.string.settings_member_refreshed), Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                }
                                generalSection()
                            }
                            1 -> playerSection()
                            2 -> homeSection()
                            3 -> startupSection()
                            4 -> dataSection()
                            5 -> lockSection()
                            6 -> SourceListCard(
                                sources = sourcesState,
                                activeSourceId = activeSourceId,
                                syncingIds = syncingIds,
                                syncingAll = syncingAll,
                                onSyncAll = {
                                    viewModel.syncAllSources()
                                    Toast.makeText(context, context.getString(R.string.settings_syncing_all), Toast.LENGTH_LONG).show()
                                },
                                onEdit = onEditSource,
                                onSync = { viewModel.syncSource(it) },
                                onDelete = { viewModel.deleteSource(it) },
                                onSwitch = { viewModel.switchSource(it) },
                                onAddSource = onAddSource
                            )
                            7 -> AboutCard(
                                versionName = viewModel.versionName,
                                updateState = updateState,
                                autoCheckUpdate = autoCheckUpdate,
                                onAutoCheckUpdateChange = updateViewModel::setAutoCheckUpdate,
                                onCheckUpdate = { updateViewModel.check() }
                            )
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    if (sourceType == "xtream") {
                        UserInfoCard(
                            userInfo = userInfo,
                            refreshing = refreshingUser,
                            onRefresh = {
                                viewModel.refreshUserInfo()
                                Toast.makeText(context, context.getString(R.string.settings_member_refreshed), Toast.LENGTH_SHORT).show()
                            }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    generalSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    playerSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    homeSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    startupSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    dataSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    lockSection()

                    Spacer(modifier = Modifier.height(12.dp))

                    SourceListCard(
                        sources = sourcesState,
                        activeSourceId = activeSourceId,
                        syncingIds = syncingIds,
                        syncingAll = syncingAll,
                        onSyncAll = {
                            viewModel.syncAllSources()
                            Toast.makeText(context, context.getString(R.string.settings_syncing_all), Toast.LENGTH_LONG).show()
                        },
                        onEdit = onEditSource,
                        onSync = { viewModel.syncSource(it) },
                        onDelete = { viewModel.deleteSource(it) },
                        onSwitch = { viewModel.switchSource(it) },
                        onAddSource = onAddSource
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    AboutCard(
                        versionName = viewModel.versionName,
                        updateState = updateState,
                        autoCheckUpdate = autoCheckUpdate,
                        onAutoCheckUpdateChange = updateViewModel::setAutoCheckUpdate,
                        onCheckUpdate = { updateViewModel.check() }
                    )
                }
            }
        }
            if (showTmdbKeyDialog) {
                TmdbKeyDialog(
                    initialKey = tmdbKeyInput,
                    onDismiss = { showTmdbKeyDialog = false },
                    onSave = { newKey ->
                        viewModel.setTmdbApiKey(newKey)
                        tmdbKeyInput = newKey
                        showTmdbKeyDialog = false
                        Toast.makeText(context, context.getString(R.string.settings_tmdb_key_saved), Toast.LENGTH_SHORT).show()
                    }
                )
            }
            if (showLockPasswordDialog) {
                SetLockPasswordDialog(
                    initial = lockPasswordInput,
                    onDismiss = { showLockPasswordDialog = false },
                    onSave = { newPassword ->
                        viewModel.setCategoryLockPassword(newPassword)
                        lockPasswordInput = newPassword
                        showLockPasswordDialog = false
                        Toast.makeText(context, context.getString(R.string.settings_lock_saved), Toast.LENGTH_SHORT).show()
                    }
                )
            }
            if (updateState != UpdateState.Idle) {
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
    }
}

private fun formatSpeedLabel(speed: Float): String =
    if (speed % 1f == 0f) "${speed.toInt()}" else "${speed}"

@Composable
private fun LanguageRow() {
    val context = LocalContext.current
    val current = AppCompatDelegate.getApplicationLocales()
    val currentTag = current.toLanguageTags()
    val options = listOf(
        "" to stringResource(R.string.settings_language_system),
        "zh" to stringResource(R.string.settings_language_zh),
        "en" to stringResource(R.string.settings_language_en)
    )
    var expanded by remember { mutableStateOf(false) }
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_language), style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = options.first { it.first == currentTag }.second,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF888888)
            )
        }
        Box {
            Text(
                text = options.first { it.first == currentTag }.second,
                color = accent.primary,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (tag, label) ->
                    DropdownMenuItem(
                        text = { Text(label, color = Color.White) },
                        onClick = {
                            expanded = false
                            AppCompatDelegate.setApplicationLocales(
                                if (tag.isEmpty()) LocaleListCompat.getEmptyLocaleList()
                                else LocaleListCompat.forLanguageTags(tag)
                            )
                            (context as? Activity)?.recreate()
                        }
                    )
                }
            }
        }
    }
}



@Composable
private fun PosterScaleRow(
    selected: String,
    onSelect: (String) -> Unit
) {
    val options = listOf(
        "cover" to stringResource(R.string.settings_poster_cover),
        "fit" to stringResource(R.string.settings_poster_fit),
        "inside" to stringResource(R.string.settings_poster_inside),
        "fill_width" to stringResource(R.string.settings_poster_fill_width),
        "fill_height" to stringResource(R.string.settings_poster_fill_height)
    )
    var expanded by remember { mutableStateOf(false) }
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_poster_content_scale), style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(stringResource(R.string.settings_poster_content_scale_desc), style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
        }
        Box {
            Text(
                text = options.first { it.first == selected }.second,
                color = accent.primary,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { (key, label) ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = label + if (key == selected) " ✓" else "",
                                color = Color.White
                            )
                        },
                        onClick = {
                            onSelect(key)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ThemeColorRow(
    selected: String,
    onSelect: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(stringResource(R.string.settings_theme_color), style = MaterialTheme.typography.bodyLarge, color = Color.White)
        Spacer(modifier = Modifier.height(12.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            ThemeAccent.entries.forEach { themeAccent ->
                val isSelected = themeAccent.key == selected
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(themeAccent.palette.vibrant)
                        .then(
                            if (isSelected) Modifier.border(2.dp, Color.White, CircleShape)
                            else Modifier
                        )
                        .clickable { onSelect(themeAccent.key) },
                    contentAlignment = Alignment.Center
                ) {
                    if (isSelected) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PlaybackSpeedRow(
    selected: Float,
    onSelect: (Float) -> Unit
) {
    val speeds = listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)
    var expanded by remember { mutableStateOf(false) }
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_default_speed), style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(stringResource(R.string.settings_default_speed_desc), style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
        }
        Box {
            Text(
                text = stringResource(R.string.settings_speed_x, formatSpeedLabel(selected)),
                color = accent.primary,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                speeds.forEach { speed ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = stringResource(R.string.settings_speed_x, formatSpeedLabel(speed)) + if (speed == selected) " ✓" else "",
                                color = Color.White
                            )
                        },
                        onClick = {
                            onSelect(speed)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun GridColumnsRow(
    selected: Int,
    onSelect: (Int) -> Unit,
    isTablet: Boolean
) {
    val options = if (isTablet) listOf(6, 8) else listOf(2, 3)
    var expanded by remember { mutableStateOf(false) }
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_grid_columns), style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(stringResource(R.string.settings_grid_columns_desc), style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
        }
        Box {
            Text(
                text = stringResource(R.string.settings_grid_columns_value, selected),
                color = accent.primary,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { columns ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = stringResource(R.string.settings_grid_columns_value, columns) + if (columns == selected) " ✓" else "",
                                color = Color.White
                            )
                        },
                        onClick = {
                            onSelect(columns)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TmdbKeyRow(key: String, onEdit: () -> Unit) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onEdit)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_tmdb_key), style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = if (key.isBlank()) {
                    stringResource(R.string.settings_tmdb_key_empty)
                } else {
                    "••••${key.takeLast(4)}"
                },
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF888888)
            )
        }
        Text(
            text = stringResource(R.string.settings_tmdb_key_edit),
            color = accent.primary,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 8.dp)
        )
    }
}

@Composable
private fun TmdbKeyDialog(
    initialKey: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var input by remember { mutableStateOf(initialKey) }
    val accent = LocalAccentPalette.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF2C2C2C),
        title = {
            Text(stringResource(R.string.settings_tmdb_key), color = Color.White)
        },
        text = {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                singleLine = true,
                placeholder = {
                    Text(
                        text = stringResource(R.string.settings_tmdb_key_hint),
                        color = Color(0xFF666666),
                        fontSize = 13.sp
                    )
                },
                visualTransformation = PasswordVisualTransformation(),
                textStyle = MaterialTheme.typography.bodySmall.copy(color = Color.White),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = accent.vibrant,
                    focusedBorderColor = accent.vibrant,
                    unfocusedBorderColor = Color(0xFF3A3A4A),
                    focusedContainerColor = Color.White.copy(alpha = 0.06f),
                    unfocusedContainerColor = Color.White.copy(alpha = 0.06f)
                )
            )
        },
        confirmButton = {
            TextButton(onClick = { onSave(input) }) {
                Text(stringResource(R.string.common_save), color = accent.vibrant)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel), color = Color(0xFF999999))
            }
        }
    )
}

@Composable
private fun SetLockPasswordDialog(
    initial: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var input by remember { mutableStateOf(initial) }
    val accent = LocalAccentPalette.current
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF2C2C2C),
        title = {
            Text(stringResource(R.string.settings_lock_password_title), color = Color.White)
        },
        text = {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                placeholder = {
                    Text(
                        text = stringResource(R.string.settings_lock_password_hint),
                        color = Color(0xFF666666),
                        fontSize = 13.sp
                    )
                },
                textStyle = MaterialTheme.typography.bodySmall.copy(color = Color.White),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = accent.vibrant,
                    focusedBorderColor = accent.vibrant,
                    unfocusedBorderColor = Color(0xFF3A3A4A),
                    focusedContainerColor = Color.White.copy(alpha = 0.06f),
                    unfocusedContainerColor = Color.White.copy(alpha = 0.06f)
                )
            )
        },
        confirmButton = {
            TextButton(onClick = { onSave(input.trim()) }) {
                Text(stringResource(R.string.common_save), color = accent.vibrant)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.common_cancel), color = Color(0xFF999999))
            }
        }
    )
}

@Composable
private fun SectionCard(
    title: String,
    icon: ImageVector,
    content: @Composable () -> Unit
) {
    val accent = LocalAccentPalette.current
    Card(colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f))) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = null, tint = accent.primary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = title, style = MaterialTheme.typography.titleMedium, color = Color.White)
            }
            androidx.compose.material3.HorizontalDivider(color = Color(0xFF3A3A3A), thickness = 0.5.dp)
            content()
        }
    }
}

@Composable
private fun SettingSwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = accent.vibrant
            )
        )
    }
}

@Composable
private fun HorizontalDividerItem() {
    androidx.compose.material3.HorizontalDivider(color = Color(0xFF3A3A3A), thickness = 0.5.dp)
}

@Composable
private fun ActionRow(
    title: String,
    subtitle: String,
    enabled: Boolean,
    loading: Boolean = false,
    onClick: () -> Unit
) {
    val accent = LocalAccentPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.bodyLarge,
                color = if (enabled) Color.White else Color(0xFF888888)
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF888888))
        }
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
        } else {
            Text(">", color = if (enabled) accent.primary else Color(0xFF555555), fontSize = 16.sp)
        }
    }
}

private fun formatCacheSize(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val mb = bytes / 1024.0 / 1024.0
    if (mb >= 1) return String.format("%.1f MB", mb)
    val kb = bytes / 1024.0
    if (kb >= 1) return String.format("%.0f KB", kb)
    return "$bytes B"
}

@Composable
private fun UserInfoCard(
    userInfo: com.dream.wowiptv.domain.model.UserInfo?,
    refreshing: Boolean,
    onRefresh: () -> Unit
) {
    val accent = LocalAccentPalette.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = androidx.compose.ui.graphics.Brush.horizontalGradient(
                        colors = if (userInfo != null)
                            listOf(accent.primary, accent.vibrant, accent.dark)
                        else
                            listOf(Color(0xFF444444), Color(0xFF333333))
                    )
                )
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = if (userInfo != null) Color.White else Color(0xFF888888),
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (userInfo != null) stringResource(R.string.settings_vip_member) else stringResource(R.string.settings_source_not_connected),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (userInfo != null) Color.White else Color(0xFF888888),
                        fontWeight = FontWeight.Bold
                    )
                    if (userInfo != null) {
                        Text(
                            text = userInfo.username ?: stringResource(R.string.settings_unknown_user),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                if (userInfo != null) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = stringResource(R.string.settings_expiry, formatExpDate(userInfo.expDate)),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = stringResource(R.string.settings_max_connections, userInfo.maxConnections?.takeIf { it.isNotBlank() } ?: "1"),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(8.dp))
                if (refreshing) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    IconButton(onClick = onRefresh) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.settings_refresh_member),
                            tint = Color.White.copy(alpha = 0.9f)
                        )
                    }
                }
            }
        }
    }
}

private fun formatExpDate(dateStr: String?): String {
    if (dateStr == null || dateStr.isBlank()) return "N/A"
    val timestamp = dateStr.toLongOrNull()
    if (timestamp != null) {
        val cal = java.util.Calendar.getInstance().apply { timeInMillis = timestamp * 1000 }
        return "%04d-%02d-%02d".format(cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
    }
    return dateStr.take(10)
}

@Composable
private fun SourceListCard(
    sources: UiState<List<XtreamSource>>,
    activeSourceId: Long?,
    syncingIds: Set<Long>,
    syncingAll: Boolean,
    onSyncAll: () -> Unit,
    onEdit: (Long) -> Unit,
    onSync: (Long) -> Unit,
    onDelete: (Long) -> Unit,
    onSwitch: (Long) -> Unit,
    onAddSource: () -> Unit
) {
    val accent = LocalAccentPalette.current
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f))
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.settings_sources),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onSyncAll, enabled = !syncingAll) {
                        if (syncingAll) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = stringResource(R.string.settings_sync_all),
                                tint = accent.primary
                            )
                        }
                    }
                    IconButton(onClick = onAddSource) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = stringResource(R.string.settings_add_source),
                            tint = accent.primary
                        )
                    }
                }
            }
            when (val state = sources) {
                is UiState.Loading -> {
                    LoadingIndicator(modifier = Modifier.padding(16.dp))
                }
                is UiState.Error -> {
                    ErrorView(
                        message = state.message,
                        onRetry = {},
                        modifier = Modifier.padding(16.dp)
                    )
                }
                is UiState.Empty -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = stringResource(R.string.settings_no_source),
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color(0xFF888888)
                        )
                    }
                }
                is UiState.Success -> {
                    Column {
                        state.data.forEach { source ->
                            val isSrcActive = source.id == activeSourceId
                            SourceItem(
                                source = source,
                                isActive = isSrcActive,
                                isSyncing = source.id in syncingIds,
                                onEdit = { onEdit(source.id) },
                                onSync = { onSync(source.id) },
                                onDelete = { onDelete(source.id) },
                                onSwitch = if (!isSrcActive) { { onSwitch(source.id) } } else { null }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SourceItem(
    source: XtreamSource,
    isActive: Boolean,
    isSyncing: Boolean,
    onEdit: () -> Unit,
    onSync: () -> Unit,
    onDelete: () -> Unit,
    onSwitch: (() -> Unit)?
) {
    val accent = LocalAccentPalette.current
    val infiniteTransition = rememberInfiniteTransition(label = "sync")
    val rotation by animateFloatAsState(
        targetValue = if (isSyncing) 360f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 0.dp, vertical = 4.dp)
            .clickable { onEdit() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White.copy(alpha = 0.05f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(if (isActive) SuccessGreen else Color(0xFF444444), RoundedCornerShape(6.dp))
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = source.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${source.serverUrl}:${source.port}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFCCCCCC),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = source.username,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFCCCCCC),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (!isActive && onSwitch != null) {
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(onClick = onSwitch!!) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = stringResource(R.string.settings_set_default),
                        tint = Color(0xFFCCCCCC)
                    )
                }
            }
            IconButton(onClick = onSync, enabled = !isSyncing) {
                Icon(
                    Icons.Default.Refresh,
                    contentDescription = stringResource(R.string.settings_sync),
                    tint = if (isSyncing) Color(0xFF888888) else accent.primary,
                    modifier = Modifier.rotate(rotation)
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = stringResource(R.string.settings_delete),
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun AboutCard(
    versionName: String,
    updateState: UpdateState,
    autoCheckUpdate: Boolean,
    onAutoCheckUpdateChange: (Boolean) -> Unit,
    onCheckUpdate: () -> Unit
) {
    val accent = LocalAccentPalette.current
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f))
    ) {
        Column {
            SettingSwitchRow(
                title = stringResource(R.string.settings_auto_check_update),
                subtitle = stringResource(R.string.settings_auto_check_update_desc),
                checked = autoCheckUpdate,
                onCheckedChange = onAutoCheckUpdateChange
            )
            HorizontalDividerItem()
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = updateState != UpdateState.Checking, onClick = onCheckUpdate)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.settings_check_update),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
                if (updateState == UpdateState.Checking) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                } else {
                    Text("›", color = accent.vibrant, fontSize = 16.sp)
                }
            }
            HorizontalDividerItem()
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.settings_about),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
                Text(
                    text = "WowIPTV V$versionName",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF888888)
                )
            }
        }
    }
}
