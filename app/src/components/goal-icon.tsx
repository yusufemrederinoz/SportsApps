import { Image } from 'expo-image';

import plainBall from '@/assets/images/goal-ball-plain.png';
import namedBall from '@/assets/images/goal-ball.png';

const NAMED_FROM = 40;

export function GoalIcon({ size = 20 }: { size?: number }) {
  return (
    <Image
      source={size >= NAMED_FROM ? namedBall : plainBall}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}
