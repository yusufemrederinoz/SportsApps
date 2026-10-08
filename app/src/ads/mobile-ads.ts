import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const PROBLEM_MAX_LENGTH = 80;

const CONSENT_PROBLEM = 'consent';
const SETUP_PROBLEM = 'setup';

let preparation: Promise<string | null> | null = null;

export function problemOf(error: unknown): string {
  const { code, message } = error as { code?: unknown; message?: unknown };
  const detail = typeof code === 'string' && code.length > 0 ? code : String(message ?? error);
  return detail.split('/').pop()?.slice(0, PROBLEM_MAX_LENGTH) ?? '';
}

async function prepare(): Promise<string | null> {
  let refusal: string | null = null;
  const consent = await AdsConsent.gatherConsent().catch((error: unknown) => {
    refusal = problemOf(error);
    return AdsConsent.getConsentInfo();
  });
  if (!consent.canRequestAds) {
    return refusal ? `${CONSENT_PROBLEM}: ${refusal}` : CONSENT_PROBLEM;
  }
  await mobileAds().initialize();
  return null;
}

export function prepareAds(): Promise<string | null> {
  preparation ??= prepare().catch((error: unknown) => `${SETUP_PROBLEM}: ${problemOf(error)}`);
  return preparation.then((problem) => {
    if (problem) {
      preparation = null;
    }
    return problem;
  });
}

export interface RewardedAdEvents {
  onLoaded: () => void;
  onClosed: (earned: boolean) => void;
  onError: (problem: string) => void;
}

export interface LoadedRewardedAd {
  show: () => void;
  release: () => void;
}

export function loadRewardedAd(unitId: string, userId: string, events: RewardedAdEvents): LoadedRewardedAd {
  const ad = RewardedAd.createForAdRequest(__DEV__ ? TestIds.REWARDED : unitId, {
    serverSideVerificationOptions: { userId },
  });
  let earned = false;
  ad.addAdEventListener(RewardedAdEventType.LOADED, events.onLoaded);
  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    earned = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => events.onClosed(earned));
  ad.addAdEventListener(AdEventType.ERROR, (error) => events.onError(problemOf(error)));
  ad.load();
  return {
    show: () => void ad.show().catch((error: unknown) => events.onError(problemOf(error))),
    release: () => ad.removeAllListeners(),
  };
}

export async function needsPrivacyOptions(): Promise<boolean> {
  const consent = await AdsConsent.requestInfoUpdate();
  return consent.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

export function showPrivacyOptions(): Promise<unknown> {
  return AdsConsent.showPrivacyOptionsForm();
}
