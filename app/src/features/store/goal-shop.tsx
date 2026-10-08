import { GOAL_PACKS, type PushPlatform } from '@sportapps/protocol';
import { ErrorCode, finishTransaction, getAvailablePurchases, getPendingTransactionsIOS, useIAP, type Purchase } from 'expo-iap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@/api';
import { errorCodeOf } from '@/api/client';
import { ERROR_KEYS } from '@/auth/error-messages';
import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

import { listingOf, purchaseRequest, shopStatus, type Listing } from './purchases';

const PRODUCT_IDS = GOAL_PACKS.map((pack) => pack.productId);
const CREDITED_ELSEWHERE = 'purchase-used';
const STAGGER = 50;

const STATUS_KEYS = {
  unavailable: 'store.unavailable',
  connecting: 'store.connecting',
  loading: 'store.loading',
  empty: 'store.empty',
} as const;

interface GoalShopProps {
  token: string;
  onGoals: (goals: number) => void;
}

function unfinishedPurchases(): Promise<Purchase[]> {
  return Platform.OS === 'ios' ? getPendingTransactionsIOS() : getAvailablePurchases();
}

export function GoalShop({ token, onGoals }: GoalShopProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const [buying, setBuying] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const handled = useRef(new Set<string>());

  const settle = useCallback(
    async (purchase: Purchase) => {
      if (purchase.purchaseState === 'pending') {
        setBuying(null);
        setNotice({ text: t('store.pending'), good: true });
        return;
      }
      const request = purchaseRequest(purchase, Platform.OS as PushPlatform);
      if (!request || handled.current.has(request.proof)) {
        return;
      }
      handled.current.add(request.proof);
      try {
        const { granted, goals } = await api.purchase(token, request);
        await finishTransaction({ purchase, isConsumable: true }).catch(() => undefined);
        onGoals(goals);
        if (granted > 0) {
          playSound('win');
          haptics.success();
          setNotice({ text: t('store.granted', { goals: granted }), good: true });
        }
      } catch (error) {
        const code = errorCodeOf(error);
        if (code === CREDITED_ELSEWHERE) {
          await finishTransaction({ purchase, isConsumable: true }).catch(() => undefined);
        } else {
          handled.current.delete(request.proof);
        }
        haptics.error();
        setNotice({ text: t(code === CREDITED_ELSEWHERE ? ERROR_KEYS[code] : 'store.notCredited'), good: false });
      } finally {
        setBuying(null);
      }
    },
    [token, onGoals, t],
  );

  const recover = useCallback(async () => {
    const purchases = await unfinishedPurchases();
    purchases.forEach((purchase) => void settle(purchase));
  }, [settle]);

  const { connected, products, fetchProducts, requestPurchase, reconnect } = useIAP({
    onPurchaseSuccess: (purchase) => void settle(purchase),
    onPurchaseError: (error) => {
      setBuying(null);
      if (error.code === ErrorCode.AlreadyOwned) {
        void recover().catch(() => undefined);
      } else if (error.code !== ErrorCode.UserCancelled) {
        haptics.error();
        setNotice({ text: `${t('store.failed')} (${String(error.code ?? error.message)})`, good: false });
      }
    },
    onError: () => setFailed(true),
  });

  const load = useCallback(() => {
    void fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' })
      .then(() => setLoaded(true))
      .catch(() => undefined);
    void recover().catch(() => undefined);
  }, [fetchProducts, recover]);

  useEffect(() => {
    if (connected) {
      load();
    }
  }, [connected, load]);

  const listings = new Map(products.map((product) => [product.id, listingOf(product)]));
  const priced = [...listings.values()].filter((listing) => listing.price).length;
  const status = shopStatus({ failed, connected, loaded, products: priced });
  const refusal = products.map((product) => ('productStatusAndroid' in product ? product.productStatusAndroid : null)).find(Boolean);

  const retry = () => {
    setFailed(false);
    if (connected) {
      load();
    } else {
      void reconnect();
    }
  };

  const buy = (productId: string, listing: Listing) => {
    haptics.select();
    setNotice(null);
    setBuying(productId);
    void requestPurchase({
      request: { apple: { sku: productId }, google: { skus: [productId], offerToken: listing.offerToken } },
      type: 'in-app',
    }).catch(() => setBuying(null));
  };

  return (
    <View style={styles.container}>
      {GOAL_PACKS.map((pack, index) => {
        const listing = listings.get(pack.productId);
        const busy = buying === pack.productId;
        const disabled = !listing?.price || buying !== null;
        return (
          <Animated.View key={pack.productId} entering={FadeInDown.duration(Motion.base).delay(index * STAGGER)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('store.buy', { goals: pack.goals, price: listing?.price ?? '' })}
              accessibilityState={{ disabled, busy }}
              disabled={disabled}
              onPress={() => listing && buy(pack.productId, listing)}
              style={({ pressed }) => [styles.pack, pressed && styles.packPressed, disabled && !busy && styles.packDisabled]}>
              <GoalIcon size={30} />
              <ThemedText style={styles.amount}>{uppercase(t('progress.goals', { goals: pack.goals }))}</ThemedText>
              <View style={styles.price}>
                {busy ? (
                  <ActivityIndicator color={Colors.onAccent} />
                ) : (
                  <ThemedText style={styles.priceText}>{listing?.price || '—'}</ThemedText>
                )}
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
      {status === 'ready' ? null : (
        <ThemedText type="small" themeColor={status === 'unavailable' ? 'negative' : 'textSecondary'} style={styles.centered}>
          {t(STATUS_KEYS[status])}
          {status === 'empty' && refusal ? ` (${refusal})` : ''}
        </ThemedText>
      )}
      {status === 'unavailable' || status === 'empty' ? (
        <ActionButton label={t('store.retry')} onPress={retry} variant="secondary" />
      ) : null}
      {notice ? (
        <ThemedText
          type="smallBold"
          themeColor={notice.good ? 'positive' : 'negative'}
          style={styles.centered}
          accessibilityLiveRegion="assertive">
          {notice.text}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.panel,
  },
  packPressed: {
    backgroundColor: Colors.panelRaised,
  },
  packDisabled: {
    borderColor: Colors.stroke,
    opacity: 0.5,
  },
  amount: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 24,
    lineHeight: 28,
    color: Colors.gold,
  },
  price: {
    minWidth: 96,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: Colors.volt,
  },
  priceText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.onAccent,
  },
  centered: {
    textAlign: 'center',
  },
});
