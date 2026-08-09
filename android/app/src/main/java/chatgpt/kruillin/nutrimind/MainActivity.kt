package chatgpt.kruillin.nutrimind

import android.Manifest
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCapturedImageUri: Uri? = null
    private var pendingCapturedImageFile: File? = null

    private val mainHandler = Handler(Looper.getMainLooper())
    private val clearCapturedImageRunnable = Runnable { clearPendingCapturedImage() }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingWebPermissionRequest
            pendingWebPermissionRequest = null

            if (
                request != null &&
                TrustedOriginPolicy.mayGrantVideo(request.origin.toString(), granted && hasCameraPermission())
            ) {
                request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
            } else {
                request?.deny()
            }
        }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val captureUri = pendingCapturedImageUri
            val selectedUris = when {
                result.resultCode != RESULT_OK -> null
                result.data?.clipData != null -> result.data?.clipData?.toUris()
                result.data?.data != null -> arrayOf(result.data?.data!!)
                captureUri != null -> arrayOf(captureUri)
                else -> null
            }

            pendingFileCallback?.onReceiveValue(selectedUris)
            pendingFileCallback = null

            if (selectedUris?.contains(captureUri) == true) {
                scheduleCapturedImageCleanup()
            } else {
                clearPendingCapturedImage()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        clearAbandonedCapturedImages()

        webView = WebView(this)
        configureWebView(webView)
        setContentView(webView)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        webView.loadUrl(TrustedOriginPolicy.HOSTED_URL)
    }

    override fun onDestroy() {
        pendingWebPermissionRequest?.deny()
        pendingWebPermissionRequest = null
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = null
        clearPendingCapturedImage()
        webView.destroy()
        super.onDestroy()
    }

    private fun configureWebView(view: WebView) {
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowUniversalAccessFromFileURLs = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            safeBrowsingEnabled = true
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(view, true)
        }

        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (TrustedOriginPolicy.isTrustedWebOrigin(request.url.toString())) {
                    return false
                }

                if (request.isForMainFrame && request.url.scheme in setOf("http", "https")) {
                    openExternalBrowser(request.url)
                }

                return true
            }
        }

        view.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val grantsOnlyVideo =
                    request.resources.contentEquals(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))

                if (!grantsOnlyVideo || !TrustedOriginPolicy.isTrustedWebOrigin(request.origin.toString())) {
                    request.deny()
                    return
                }

                if (hasCameraPermission()) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                    return
                }

                pendingWebPermissionRequest?.deny()
                pendingWebPermissionRequest = request
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest) {
                if (pendingWebPermissionRequest === request) {
                    pendingWebPermissionRequest = null
                }
            }

            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                if (!acceptsImages(fileChooserParams.acceptTypes)) {
                    callback.onReceiveValue(null)
                    return true
                }

                cancelPendingFileChooser()
                pendingFileCallback = callback
                launchImageChooser(fileChooserParams.isCaptureEnabled)
                return true
            }
        }
    }

    private fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    private fun openExternalBrowser(uri: Uri) {
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
        }
    }

    private fun acceptsImages(acceptTypes: Array<String>): Boolean =
        acceptTypes.isEmpty() || acceptTypes.any { type ->
            type.isBlank() || type == "*/*" || type.startsWith("image/", ignoreCase = true)
        }

    private fun launchImageChooser(shouldOfferCamera: Boolean) {
        val pickerIntent = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*")
        } else {
            Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "image/*"
            }
        }

        val launchIntent = if (shouldOfferCamera) {
            val cameraUri = createCapturedImageUri()
            if (cameraUri == null) {
                pickerIntent
            } else {
                Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                    putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    clipData = ClipData.newRawUri("NutriMind capture", cameraUri)
                    grantUriAccessToCameraApp(this, cameraUri)
                }.let { cameraIntent ->
                    Intent.createChooser(pickerIntent, getString(R.string.choose_meal_image)).apply {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                    }
                }
            }
        } else {
            pickerIntent
        }

        runCatching { fileChooserLauncher.launch(launchIntent) }
            .onFailure { cancelPendingFileChooser() }
    }

    private fun createCapturedImageUri(): Uri? = runCatching {
        clearPendingCapturedImage()
        val captureDirectory = File(cacheDir, CAPTURE_DIRECTORY).apply { mkdirs() }
        val captureFile = File.createTempFile("meal-capture-", ".jpg", captureDirectory)
        val captureUri = FileProvider.getUriForFile(this, "${BuildConfig.APPLICATION_ID}.fileprovider", captureFile)
        pendingCapturedImageFile = captureFile
        pendingCapturedImageUri = captureUri
        captureUri
    }.getOrNull()

    private fun grantUriAccessToCameraApp(intent: Intent, uri: Uri) {
        val grantFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY).forEach { resolved ->
            grantUriPermission(resolved.activityInfo.packageName, uri, grantFlags)
        }
    }

    private fun cancelPendingFileChooser() {
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = null
        clearPendingCapturedImage()
    }

    private fun scheduleCapturedImageCleanup() {
        mainHandler.removeCallbacks(clearCapturedImageRunnable)
        mainHandler.postDelayed(clearCapturedImageRunnable, CAPTURE_UPLOAD_GRACE_MS)
    }

    private fun clearPendingCapturedImage() {
        mainHandler.removeCallbacks(clearCapturedImageRunnable)
        pendingCapturedImageUri?.let { uri ->
            revokeUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
        pendingCapturedImageFile?.takeIf(File::exists)?.delete()
        pendingCapturedImageUri = null
        pendingCapturedImageFile = null
    }

    private fun clearAbandonedCapturedImages() {
        File(cacheDir, CAPTURE_DIRECTORY).listFiles()?.forEach { file ->
            if (file.isFile) {
                file.delete()
            }
        }
    }

    private fun ClipData.toUris(): Array<Uri> =
        Array(itemCount) { index -> getItemAt(index).uri }

    private companion object {
        const val CAPTURE_DIRECTORY = "captured-images"
        const val CAPTURE_UPLOAD_GRACE_MS = 30_000L
    }
}
