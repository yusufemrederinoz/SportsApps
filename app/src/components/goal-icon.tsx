import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';

import { Colors } from '@/constants/theme';

const PANEL_ANGLES = [0, 1, 2, 3, 4].map((index) => -Math.PI / 2 + (index * 2 * Math.PI) / 5);

function pentagon(cx: number, cy: number, radius: number, turn = 0) {
  const path = Skia.PathBuilder.Make();
  PANEL_ANGLES.forEach((angle, index) => {
    const x = cx + radius * Math.cos(angle + turn);
    const y = cy + radius * Math.sin(angle + turn);
    if (index === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  });
  path.close();
  return path.build();
}

function seams(cx: number, cy: number, inner: number, outer: number) {
  const path = Skia.PathBuilder.Make();
  PANEL_ANGLES.forEach((angle) => {
    path.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
    path.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
  });
  return path.build();
}

export function GoalIcon({ size = 20 }: { size?: number }) {
  const half = size / 2;
  const radius = half - 1;
  const center = vec(half, half);
  const edgePanels = PANEL_ANGLES.map((angle) =>
    pentagon(half + radius * 0.98 * Math.cos(angle), half + radius * 0.98 * Math.sin(angle), radius * 0.3, Math.PI / 5),
  );

  return (
    <Canvas style={{ width: size, height: size }} accessible={false}>
      <Circle cx={half} cy={half} r={radius}>
        <RadialGradient c={vec(half * 0.7, half * 0.6)} r={radius * 1.4} colors={['#FFFFFF', '#D9DEE6', '#8E99A8']} />
      </Circle>
      <Group clip={Skia.Path.Circle(half, half, radius)}>
        {edgePanels.map((panel, index) => (
          <Path key={index} path={panel} color={Colors.ink} />
        ))}
      </Group>
      <Path path={seams(half, half, radius * 0.36, radius * 0.72)} style="stroke" strokeWidth={Math.max(1, size / 18)} color={Colors.ink} />
      <Path path={pentagon(center.x, center.y, radius * 0.38)} color={Colors.ink} />
      <Circle cx={half} cy={half} r={radius} style="stroke" strokeWidth={Math.max(1, size / 20)} color={Colors.ink} opacity={0.6} />
    </Canvas>
  );
}
