/**
 * WebView detection utility
 *
 * Detects if the user is browsing in an embedded WebView (e.g., Facebook, Instagram)
 * which blocks Google OAuth for security reasons.
 */

const WEBVIEW_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /FBAN|FBAV/i, name: "Facebook" },
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /LinkedInApp/i, name: "LinkedIn" },
  { pattern: /WhatsApp/i, name: "WhatsApp" },
  { pattern: /Twitter/i, name: "Twitter" },
  { pattern: /Line\//i, name: "Line" },
  { pattern: /Snapchat/i, name: "Snapchat" },
  { pattern: /\bwv\b/, name: "WebView" },
  { pattern: /WebView/i, name: "WebView" },
];

/**
 * Detects if the current browser is a WebView
 */
export function isWebView(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || "";

  return WEBVIEW_PATTERNS.some(({ pattern }) => pattern.test(ua));
}

/**
 * Returns the name of the app if a WebView is detected
 */
export function getWebViewSource(): string | null {
  if (typeof window === "undefined") return null;

  const ua = navigator.userAgent || "";

  for (const { pattern, name } of WEBVIEW_PATTERNS) {
    if (pattern.test(ua)) {
      return name;
    }
  }

  return null;
}
