package com.dream.wowiptv.presentation.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.R
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.data.local.dao.LiveCategoryDao
import com.dream.wowiptv.data.local.dao.SeriesCategoryDao
import com.dream.wowiptv.data.local.dao.VodCategoryDao
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.domain.usecase.ManageSourcesUseCase
import com.dream.wowiptv.presentation.common.CategoryLocks
import com.dream.wowiptv.presentation.common.components.CategoryLockDialog
import com.dream.wowiptv.presentation.common.components.EmptyState
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class ManageCategoryLocksViewModel @Inject constructor(
    private val manageSourcesUseCase: ManageSourcesUseCase,
    private val liveCategoryDao: LiveCategoryDao,
    private val vodCategoryDao: VodCategoryDao,
    private val seriesCategoryDao: SeriesCategoryDao,
    private val appPreferences: AppPreferences
) : ViewModel() {

    data class CategoryRow(val id: Int, val name: String, val locked: Boolean)

    val sources: StateFlow<List<XtreamSource>> = manageSourcesUseCase.getSources()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _selectedSourceId = MutableStateFlow<Long?>(null)
    val selectedSourceId: StateFlow<Long?> = _selectedSourceId.asStateFlow()

    private val _authorized = MutableStateFlow(false)
    val authorized: StateFlow<Boolean> = _authorized.asStateFlow()

    val lockPassword: StateFlow<String> = appPreferences.categoryLockPassword
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val locks: StateFlow<Set<String>> = appPreferences.categoryLocks
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptySet())

    val liveRows: StateFlow<List<CategoryRow>> = _selectedSourceId
        .flatMapLatest { sid ->
            if (sid == null) {
                flowOf(emptyList())
            } else {
                combine(liveCategoryDao.getBySource(sid), locks) { cats, ls ->
                    cats.map {
                        CategoryRow(
                            id = it.categoryId,
                            name = it.name,
                            locked = CategoryLocks.key(CategoryLocks.TYPE_LIVE, sid, it.categoryId) in ls
                        )
                    }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val vodRows: StateFlow<List<CategoryRow>> = _selectedSourceId
        .flatMapLatest { sid ->
            if (sid == null) {
                flowOf(emptyList())
            } else {
                combine(vodCategoryDao.getBySource(sid), locks) { cats, ls ->
                    cats.map {
                        CategoryRow(
                            id = it.categoryId,
                            name = it.name,
                            locked = CategoryLocks.key(CategoryLocks.TYPE_VOD, sid, it.categoryId) in ls
                        )
                    }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val seriesRows: StateFlow<List<CategoryRow>> = _selectedSourceId
        .flatMapLatest { sid ->
            if (sid == null) {
                flowOf(emptyList())
            } else {
                combine(seriesCategoryDao.getBySource(sid), locks) { cats, ls ->
                    cats.map {
                        CategoryRow(
                            id = it.categoryId,
                            name = it.name,
                            locked = CategoryLocks.key(CategoryLocks.TYPE_SERIES, sid, it.categoryId) in ls
                        )
                    }
                }
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch {
            val id = manageSourcesUseCase.getActiveSource().first()?.id
            if (id != null) _selectedSourceId.value = id
        }
    }

    fun selectSource(id: Long) {
        _selectedSourceId.value = id
    }

    fun verifyPassword(input: String): Boolean {
        val expected = lockPassword.value
        if (expected.isNotEmpty() && input == expected) {
            _authorized.value = true
            return true
        }
        return false
    }

    fun toggleLock(type: String, categoryId: Int) {
        viewModelScope.launch {
            val sid = _selectedSourceId.value ?: return@launch
            val key = CategoryLocks.key(type, sid, categoryId)
            val current = locks.value
            appPreferences.setCategoryLocks(
                if (key in current) current - key else current + key
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageCategoryLocksScreen(
    onBack: () -> Unit,
    viewModel: ManageCategoryLocksViewModel = hiltViewModel()
) {
    val sources by viewModel.sources.collectAsState()
    val selectedSourceId by viewModel.selectedSourceId.collectAsState()
    val authorized by viewModel.authorized.collectAsState()
    val liveRows by viewModel.liveRows.collectAsState()
    val vodRows by viewModel.vodRows.collectAsState()
    val seriesRows by viewModel.seriesRows.collectAsState()
    val accent = LocalAccentPalette.current

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
            if (!authorized) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CategoryLockDialog(
                        categoryName = stringResource(R.string.manage_locks_title),
                        hintText = stringResource(R.string.manage_locks_enter_password),
                        onDismiss = onBack,
                        onVerifyPassword = { viewModel.verifyPassword(it) },
                        onUnlocked = {}
                    )
                }
            } else {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text(stringResource(R.string.manage_locks_title), color = Color.White) },
                        navigationIcon = {
                            IconButton(onClick = onBack) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = stringResource(R.string.common_back),
                                    tint = Color.White
                                )
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Color.Transparent,
                            titleContentColor = Color.White
                        )
                    )
                },
                containerColor = Color.Transparent
            ) { innerPadding ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    if (sources.isEmpty()) {
                        EmptyState(
                            text = stringResource(R.string.manage_locks_no_sources),
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(sources, key = { it.id }) { source ->
                                FilterChip(
                                    selected = selectedSourceId == source.id,
                                    onClick = { viewModel.selectSource(source.id) },
                                    label = { Text(source.name, maxLines = 1) }
                                )
                            }
                        }
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 24.dp)
                        ) {
                            if (selectedSourceId == null) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = stringResource(R.string.manage_locks_pick_source),
                                            color = Color(0xFF888888)
                                        )
                                    }
                                }
                            } else {
                                item { LockSectionHeader(stringResource(R.string.manage_locks_section_live)) }
                                if (liveRows.isEmpty()) {
                                    item { LockSectionEmpty() }
                                } else {
                                    items(liveRows, key = { "${CategoryLocks.TYPE_LIVE}_${it.id}" }) { row ->
                                        LockCategoryRow(
                                            name = row.name,
                                            locked = row.locked,
                                            onToggle = { viewModel.toggleLock(CategoryLocks.TYPE_LIVE, row.id) }
                                        )
                                    }
                                }
                                item { LockSectionHeader(stringResource(R.string.manage_locks_section_vod)) }
                                if (vodRows.isEmpty()) {
                                    item { LockSectionEmpty() }
                                } else {
                                    items(vodRows, key = { "${CategoryLocks.TYPE_VOD}_${it.id}" }) { row ->
                                        LockCategoryRow(
                                            name = row.name,
                                            locked = row.locked,
                                            onToggle = { viewModel.toggleLock(CategoryLocks.TYPE_VOD, row.id) }
                                        )
                                    }
                                }
                                item { LockSectionHeader(stringResource(R.string.manage_locks_section_series)) }
                                if (seriesRows.isEmpty()) {
                                    item { LockSectionEmpty() }
                                } else {
                                    items(seriesRows, key = { "${CategoryLocks.TYPE_SERIES}_${it.id}" }) { row ->
                                        LockCategoryRow(
                                            name = row.name,
                                            locked = row.locked,
                                            onToggle = { viewModel.toggleLock(CategoryLocks.TYPE_SERIES, row.id) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            }
        }
    }
}

@Composable
private fun LockSectionHeader(title: String) {
    Text(
        text = title,
        color = Color(0xFFAAAAAA),
        fontSize = 13.sp,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp)
    )
}

@Composable
private fun LockSectionEmpty() {
    Text(
        text = stringResource(R.string.manage_locks_empty),
        color = Color(0xFF666666),
        fontSize = 13.sp,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
    )
}

@Composable
private fun LockCategoryRow(
    name: String,
    locked: Boolean,
    onToggle: () -> Unit
) {
    val accent = LocalAccentPalette.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 3.dp),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2A2A2A))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = name,
                color = Color.White,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = if (locked) Icons.Filled.Lock else Icons.Filled.LockOpen,
                contentDescription = stringResource(if (locked) R.string.common_locked else R.string.common_unlocked),
                tint = if (locked) Color(0xFFE6B34C) else Color(0xFF666666),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Switch(
                checked = locked,
                onCheckedChange = { onToggle() },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = accent.vibrant
                )
            )
        }
    }
}