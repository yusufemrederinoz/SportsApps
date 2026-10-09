const ANDROID_PACKAGE = 'com.challengegoal.app';
const APPLE_APP_ID = '6820528682';

export function storeLinks(platform: string): readonly string[] {
  return platform === 'ios'
    ? [`itms-apps://apps.apple.com/app/id${APPLE_APP_ID}`, `https://apps.apple.com/app/id${APPLE_APP_ID}`]
    : [`market://details?id=${ANDROID_PACKAGE}`, `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`];
}

export async function openStore(platform: string, open: (url: string) => Promise<unknown>): Promise<boolean> {
  for (const url of storeLinks(platform)) {
    try {
      await open(url);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}
