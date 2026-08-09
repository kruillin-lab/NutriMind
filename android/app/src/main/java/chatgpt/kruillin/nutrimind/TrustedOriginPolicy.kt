package chatgpt.kruillin.nutrimind

import java.net.URI

object TrustedOriginPolicy {
    const val HOSTED_URL = "https://nutrimind.kruillin.chatgpt.site"

    private const val TRUSTED_HOST = "nutrimind.kruillin.chatgpt.site"

    fun isTrustedWebOrigin(url: String): Boolean {
        val uri = runCatching { URI(url) }.getOrNull() ?: return false

        return uri.scheme.equals("https", ignoreCase = true) &&
            uri.host.equals(TRUSTED_HOST, ignoreCase = true) &&
            uri.rawUserInfo == null &&
            (uri.port == -1 || uri.port == 443)
    }

    fun mayGrantVideo(origin: String, hasCameraPermission: Boolean): Boolean =
        hasCameraPermission && isTrustedWebOrigin(origin)
}
