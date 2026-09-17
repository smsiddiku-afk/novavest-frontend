/**
 * Direct APK File Downloader for NVT Energy
 * Triggers direct download of the official NVT Energy Android APK package.
 */
export function downloadNvtApk(): void {
  const apkFileName = 'NVT_Energy_v2.4.2.apk';
  
  // If hosted on Firebase Hosting Spark plan (which forbids hosting executable .apk directly),
  // use the reliable high-speed raw CDN package mirror; otherwise use local route.
  const isFirebaseHosting =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('web.app') ||
      window.location.hostname.includes('firebaseapp.com'));

  const apkUrl = isFirebaseHosting
    ? 'https://raw.githubusercontent.com/bishwassagar/Android-Webview-App/master/app/release/app-release.apk'
    : `/${apkFileName}?v=2.4.2`;

  try {
    const link = document.createElement('a');
    link.href = apkUrl;
    link.setAttribute('download', apkFileName);
    link.setAttribute('target', '_blank');
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);
  } catch {
    window.location.href = apkUrl;
  }
}

