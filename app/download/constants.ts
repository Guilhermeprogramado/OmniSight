const GITHUB_RELEASE_BASE =
  "https://github.com/Guilhermeprogramado/OmniSight/releases/latest/download";

export const downloadLinks = {
  macos: `${GITHUB_RELEASE_BASE}/OmniSight-universal.dmg`,
  windows: `${GITHUB_RELEASE_BASE}/OmniSight-windows-x64.exe`,
  linuxAppImage: `${GITHUB_RELEASE_BASE}/OmniSight-linux-x64.AppImage`,
  linuxArm64AppImage: `${GITHUB_RELEASE_BASE}/OmniSight-linux-arm64.AppImage`,
  linuxDeb: `${GITHUB_RELEASE_BASE}/OmniSight-linux-x64.deb`,
  linuxArm64Deb: `${GITHUB_RELEASE_BASE}/OmniSight-linux-arm64.deb`,
};
