package chatgpt.kruillin.nutrimind

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TrustedOriginPolicyTest {
    @Test
    fun `allows only NutriMind HTTPS navigation`() {
        assertTrue(TrustedOriginPolicy.isTrustedWebOrigin("https://nutrimind.kruillin.chatgpt.site/dashboard"))
        assertFalse(TrustedOriginPolicy.isTrustedWebOrigin("http://nutrimind.kruillin.chatgpt.site"))
        assertFalse(TrustedOriginPolicy.isTrustedWebOrigin("https://nutrimind.kruillin.chatgpt.site:444"))
        assertFalse(TrustedOriginPolicy.isTrustedWebOrigin("https://nutrimind.kruillin.chatgpt.site.evil.example"))
        assertFalse(TrustedOriginPolicy.isTrustedWebOrigin("https://evil.example"))
    }

    @Test
    fun `grants only video capture to trusted origin with Android camera permission`() {
        assertTrue(
            TrustedOriginPolicy.mayGrantVideo(
                origin = "https://nutrimind.kruillin.chatgpt.site",
                hasCameraPermission = true,
            ),
        )
        assertFalse(
            TrustedOriginPolicy.mayGrantVideo(
                origin = "https://nutrimind.kruillin.chatgpt.site",
                hasCameraPermission = false,
            ),
        )
        assertFalse(
            TrustedOriginPolicy.mayGrantVideo(
                origin = "https://evil.example",
                hasCameraPermission = true,
            ),
        )
    }
}
