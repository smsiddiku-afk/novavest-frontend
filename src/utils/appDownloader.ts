/**
 * Direct APK File Downloader for NVT Energy
 * Triggers direct download of the certified NVT Energy Android APK package.
 */
export function downloadNvtApk(): void {
  const apkFileName = 'NVT_Energy_v2.4.2.apk';
  const apkUrl = `/${apkFileName}`;

  const link = document.createElement('a');
  link.href = apkUrl;
  link.setAttribute('download', apkFileName);
  link.setAttribute('target', '_blank');
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
