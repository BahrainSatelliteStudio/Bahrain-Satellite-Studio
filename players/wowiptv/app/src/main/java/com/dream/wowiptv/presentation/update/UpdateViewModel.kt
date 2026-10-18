package com.dream.wowiptv.presentation.update

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dream.wowiptv.BuildConfig
import com.dream.wowiptv.data.local.AppPreferences
import com.dream.wowiptv.domain.usecase.CheckUpdateUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

sealed interface UpdateState {
    object Idle : UpdateState
    object Checking : UpdateState
    object UpToDate : UpdateState
    data class Available(val version: String, val url: String) : UpdateState
    data class Downloading(val progress: Float) : UpdateState
    object Downloaded : UpdateState
    object Error : UpdateState
}

@HiltViewModel
class UpdateViewModel @Inject constructor(
    private val checkUpdateUseCase: CheckUpdateUseCase,
    private val okHttpClient: OkHttpClient,
    private val appPreferences: AppPreferences,
    @ApplicationContext private val context: Context
) : ViewModel() {

    companion object {
        private const val OWNER = "ljd1995"
        private const val REPO = "WowIPTV"
    }

    private val _state = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val state: StateFlow<UpdateState> = _state.asStateFlow()

    val autoCheckUpdate: StateFlow<Boolean> = appPreferences.autoCheckUpdate
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    private var apkFile: File? = null

    fun check() {
        if (_state.value == UpdateState.Checking || _state.value is UpdateState.Available) return
        _state.value = UpdateState.Checking
        viewModelScope.launch {
            val info = checkUpdateUseCase(OWNER, REPO, BuildConfig.VERSION_NAME)
            _state.value = if (info == null) UpdateState.UpToDate else UpdateState.Available(info.latestVersion, info.downloadUrl)
        }
    }

    fun setAutoCheckUpdate(enabled: Boolean) {
        viewModelScope.launch { appPreferences.setAutoCheckUpdate(enabled) }
    }

    fun download() {
        val available = _state.value as? UpdateState.Available ?: return
        _state.value = UpdateState.Downloading(0f)
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val dir = File(context.filesDir, "apk").apply { mkdirs() }
                    val file = File(dir, "wowiptv-${available.version}.apk")
                    val request = Request.Builder().url(available.url).build()
                    okHttpClient.newCall(request).execute().use { response ->
                        if (!response.isSuccessful) {
                            _state.value = UpdateState.Error
                            return@withContext
                        }
                        val body = response.body ?: run {
                            _state.value = UpdateState.Error
                            return@withContext
                        }
                        val total = body.contentLength()
                        body.byteStream().use { input ->
                            file.outputStream().use { output ->
                                val buffer = ByteArray(8192)
                                var downloaded = 0L
                                while (true) {
                                    val read = input.read(buffer)
                                    if (read == -1) break
                                    output.write(buffer, 0, read)
                                    downloaded += read
                                    if (total > 0) {
                                        _state.value = UpdateState.Downloading(downloaded.toFloat() / total)
                                    }
                                }
                            }
                        }
                    }
                    apkFile = file
                    _state.value = UpdateState.Downloaded
                } catch (_: Exception) {
                    _state.value = UpdateState.Error
                }
            }
        }
    }

    fun install() {
        val file = apkFile ?: return
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    fun dismiss() {
        _state.value = UpdateState.Idle
    }
}
