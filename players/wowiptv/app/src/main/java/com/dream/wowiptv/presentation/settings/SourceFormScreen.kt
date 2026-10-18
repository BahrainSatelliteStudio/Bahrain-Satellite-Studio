package com.dream.wowiptv.presentation.settings

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.dream.wowiptv.R
import com.dream.wowiptv.data.parser.M3uPlaylistParser
import com.dream.wowiptv.domain.model.XtreamSource
import com.dream.wowiptv.presentation.common.UiState
import com.dream.wowiptv.presentation.common.components.GradientBackground
import com.dream.wowiptv.presentation.common.components.LoadingIndicator
import com.dream.wowiptv.presentation.common.theme.DarkColorScheme
import com.dream.wowiptv.presentation.common.theme.LocalAccentPalette
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URI

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SourceFormScreen(
    sourceId: Long? = null,
    onNavigateBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val sourcesState by viewModel.sources.collectAsStateWithLifecycle()

    val editingSource = if (sourceId != null) {
        val list = (sourcesState as? UiState.Success)?.data ?: emptyList()
        list.find { it.id == sourceId }
    } else null

    if (sourceId != null && editingSource == null && sourcesState !is UiState.Empty && sourcesState !is UiState.Error) {
        LoadingIndicator(message = stringResource(R.string.common_loading))
        return
    }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    key(sourceId ?: -1L) {
        SourceFormInner(
            initialSource = editingSource,
            isEditing = sourceId != null,
            viewModel = viewModel,
            onSave = { name, serverUrl, username, password ->
                scope.launch {
                    val (host, port) = parseServerUrl(serverUrl)
                    if (sourceId != null) {
                        viewModel.updateSource(sourceId, name, host, port, username, password)
                    } else {
                        viewModel.addSource(name, host, port, username, password)
                    }
                    onNavigateBack()
                }
            },
            onImport = { name, url, content ->
                importM3u(context, sourceId, name, url, content, viewModel)
            },
            onNavigateBack = onNavigateBack
        )
    }
}

private suspend fun importM3u(
    context: Context,
    sourceId: Long?,
    name: String,
    url: String?,
    content: String?,
    viewModel: SettingsViewModel
) {
    val urlText = url?.trim().orEmpty()
    if (sourceId != null) {
        when {
            urlText.isNotBlank() -> viewModel.updateSource(sourceId, name, urlText, 80, "", "")
            content != null -> {
                val path = writeM3uFile(context, sourceId, content)
                viewModel.updateSource(sourceId, name, path, 80, "", "")
            }
        }
    } else if (urlText.isNotBlank()) {
        viewModel.addSource(name, urlText, 80, "", "", "m3u")
    } else if (content != null) {
        val path = writeM3uFile(context, name.hashCode().toLong(), content)
        viewModel.addSource(name, path, 80, "", "", "m3u")
    }
}

private suspend fun writeM3uFile(context: Context, id: Long, content: String): String {
    return withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, "m3u").apply { mkdirs() }
        File(dir, "$id.m3u").writeText(content)
        "file://m3u/$id.m3u"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SourceFormInner(
    initialSource: XtreamSource?,
    isEditing: Boolean,
    viewModel: SettingsViewModel,
    onSave: (name: String, serverUrl: String, username: String, password: String) -> Unit,
    onImport: suspend (name: String, url: String?, content: String?) -> Unit,
    onNavigateBack: () -> Unit
) {
    val accent = LocalAccentPalette.current
    val initialUrl = if (initialSource != null) "http://${initialSource.serverUrl}:${initialSource.port}" else ""
    var sourceType by remember { mutableStateOf(initialSource?.type ?: "xtream") }
    var name by remember { mutableStateOf(initialSource?.name ?: "") }
    var serverUrl by remember { mutableStateOf(initialUrl) }
    var username by remember { mutableStateOf(initialSource?.username ?: "") }
    var password by remember { mutableStateOf(initialSource?.password ?: "") }
    var m3uUrl by remember { mutableStateOf(initialSource?.serverUrl ?: "") }
    var selectedFileContent by remember { mutableStateOf<String?>(null) }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var importError by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    var testing by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<com.dream.wowiptv.domain.usecase.SourceTestResult?>(null) }

    val isValid = name.isNotBlank() && serverUrl.isNotBlank() && username.isNotBlank() && password.isNotBlank()
    val isImportValid = name.isNotBlank() && (m3uUrl.isNotBlank() || selectedFileContent != null)
    val textColor = Color.White
    val labelColor = Color(0xFF999999)
    val fieldBg = Color.White.copy(alpha = 0.06f)

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    fun runTest() {
        if (testing || saving) return
        testing = true
        testResult = null
        scope.launch {
            val res = if (sourceType == "xtream") {
                val (host, port) = parseServerUrl(serverUrl)
                viewModel.testXtream(host, port, username, password)
            } else {
                viewModel.testM3u(m3uUrl.trim().ifBlank { null }, selectedFileContent)
            }
            testResult = res
            testing = false
        }
    }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            scope.launch {
                val text = withContext(Dispatchers.IO) {
                    context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                }
                if (text != null) {
                    selectedFileContent = text
                    selectedFileName = context.getDisplayName(uri)
                    val channels = withContext(Dispatchers.IO) {
                        M3uPlaylistParser.parse(text, "") { n -> context.getString(R.string.common_channel_name, n) }
                    }
                    importError = if (channels.isEmpty()) context.getString(R.string.form_no_valid_channels) else null
                }
            }
        }
    }

    MaterialTheme(colorScheme = DarkColorScheme) {
        GradientBackground {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(if (isEditing) R.string.form_edit_source else R.string.form_add_source), color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = Color.White)
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
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Transparent)
            ) {
                FilterChip(
                    selected = sourceType == "xtream",
                    onClick = { sourceType = "xtream" },
                    enabled = !isEditing,
                    label = { Text("Xtream", color = Color.White) }
                )
                FilterChip(
                    selected = sourceType == "m3u",
                    onClick = { sourceType = "m3u" },
                    enabled = !isEditing,
                    label = { Text("M3U", color = Color.White) }
                )
            }
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text(stringResource(R.string.form_name), color = labelColor) },
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = textColor),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = textColor,
                    unfocusedTextColor = textColor,
                    focusedBorderColor = Color(0xFF555555),
                    unfocusedBorderColor = Color(0xFF444444),
                    focusedContainerColor = fieldBg,
                    unfocusedContainerColor = fieldBg,
                    focusedLabelColor = labelColor,
                    unfocusedLabelColor = labelColor
                ),
                shape = RoundedCornerShape(8.dp)
            )
            if (sourceType == "xtream") {
                OutlinedTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it },
                    label = { Text(stringResource(R.string.form_server_url), color = labelColor) },
                    placeholder = { Text("http://example.com:80", color = Color(0xFF666666)) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = textColor),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Color(0xFF555555),
                        unfocusedBorderColor = Color(0xFF444444),
                        focusedContainerColor = fieldBg,
                        unfocusedContainerColor = fieldBg,
                        focusedLabelColor = labelColor,
                        unfocusedLabelColor = labelColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text(stringResource(R.string.form_username), color = labelColor) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = textColor),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Color(0xFF555555),
                        unfocusedBorderColor = Color(0xFF444444),
                        focusedContainerColor = fieldBg,
                        unfocusedContainerColor = fieldBg,
                        focusedLabelColor = labelColor,
                        unfocusedLabelColor = labelColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text(stringResource(R.string.form_password), color = labelColor) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = textColor),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Color(0xFF555555),
                        unfocusedBorderColor = Color(0xFF444444),
                        focusedContainerColor = fieldBg,
                        unfocusedContainerColor = fieldBg,
                        focusedLabelColor = labelColor,
                        unfocusedLabelColor = labelColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedButton(
                        onClick = { runTest() },
                        enabled = isValid && !testing && !saving,
                        modifier = Modifier.weight(0.35f).height(50.dp),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, accent.vibrant),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = accent.vibrant)
                    ) {
                        if (testing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = accent.vibrant
                            )
                        } else {
                            Text(stringResource(R.string.form_test), color = accent.vibrant)
                        }
                    }
                    Button(
                        onClick = {
                            if (testing) return@Button
                            saving = true
                            scope.launch {
                                val (host, port) = parseServerUrl(serverUrl)
                                val res = viewModel.testXtream(host, port, username, password)
                                if (res.ok) {
                                    onSave(name.trim(), serverUrl.trim(), username.trim(), password.trim())
                                } else {
                                    testResult = res
                                    saving = false
                                }
                            }
                        },
                        enabled = isValid && !saving,
                        modifier = Modifier
                            .weight(0.65f)
                            .height(50.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = accent.vibrant
                        )
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        } else {
                            Text(stringResource(R.string.common_save), color = Color.White)
                        }
                    }
                }
                testResult?.let { r ->
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = r.message,
                        color = if (r.ok) Color(0xFF43A047) else Color(0xFFFF5252),
                        fontSize = 13.sp,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                OutlinedTextField(
                    value = m3uUrl,
                    onValueChange = { m3uUrl = it },
                    label = { Text(stringResource(R.string.form_m3u_url), color = labelColor) },
                    placeholder = { Text("https://example.com/playlist.m3u", color = Color(0xFF666666)) },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = textColor),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = textColor,
                        unfocusedTextColor = textColor,
                        focusedBorderColor = Color(0xFF555555),
                        unfocusedBorderColor = Color(0xFF444444),
                        focusedContainerColor = fieldBg,
                        unfocusedContainerColor = fieldBg,
                        focusedLabelColor = labelColor,
                        unfocusedLabelColor = labelColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedButton(
                    onClick = { filePicker.launch(arrayOf("audio/x-mpegurl", "text/plain", "*/*")) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Icon(Icons.Default.FolderOpen, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (selectedFileName != null) selectedFileName!! else stringResource(R.string.form_select_m3u_file))
                }
                if (importError != null) {
                    Text(importError!!, color = Color(0xFFFF5252))
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedButton(
                        onClick = { runTest() },
                        enabled = isImportValid && importError == null && !testing && !saving,
                        modifier = Modifier.weight(0.35f).height(50.dp),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, accent.vibrant),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = accent.vibrant)
                    ) {
                        if (testing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = accent.vibrant
                            )
                        } else {
                            Text(stringResource(R.string.form_test), color = accent.vibrant)
                        }
                    }
                    Button(
                        onClick = {
                            if (testing) return@Button
                            saving = true
                            importError = null
                            scope.launch {
                                try {
                                    val res = viewModel.testM3u(m3uUrl.trim().ifBlank { null }, selectedFileContent)
                                    if (res.ok) {
                                        onImport(name.trim(), m3uUrl.trim().ifBlank { null }, selectedFileContent)
                                        onNavigateBack()
                                    } else {
                                        testResult = res
                                        saving = false
                                    }
                                } catch (e: Exception) {
                                    importError = e.message ?: context.getString(R.string.form_import_failed)
                                    saving = false
                                }
                            }
                        },
                        enabled = isImportValid && importError == null && !saving,
                        modifier = Modifier
                            .weight(0.65f)
                            .height(50.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = accent.vibrant
                        )
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                        } else {
                            Text(stringResource(R.string.common_import), color = Color.White)
                        }
                    }
                }
                testResult?.let { r ->
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = r.message,
                        color = if (r.ok) Color(0xFF43A047) else Color(0xFFFF5252),
                        fontSize = 13.sp,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
        }
    }
}

private fun Context.getDisplayName(uri: android.net.Uri): String? {
    return try {
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) cursor.getString(idx) else null
            } else null
        }
    } catch (_: Exception) {
        null
    }
}

private fun parseServerUrl(input: String): Pair<String, Int> {
    var url = input.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "http://$url"
    }
    val uri = URI(url)
    val host = uri.host ?: ""
    val port = if (uri.port > 0) uri.port else 80
    return Pair(host, port)
}
