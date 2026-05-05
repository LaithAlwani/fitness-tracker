import { Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { formatWeight, type WeightUnit } from "@fitness/shared";

type Point = {
  recordedAt: number;
  bodyweightKg: number;
};

type Props = {
  data: Point[];
  units: WeightUnit;
  width?: number;
  height?: number;
};

const STROKE = "#0ea5e9";
const STROKE_WIDTH = 2;
const POINT_RADIUS = 3;
const HORIZONTAL_PADDING = 8;
const VERTICAL_PADDING = 8;

export function BodyweightSparkline({
  data,
  units,
  width = 320,
  height = 80,
}: Props) {
  if (data.length === 0) {
    return null;
  }

  const sorted = [...data].sort((a, b) => a.recordedAt - b.recordedAt);
  const values = sorted.map((point) => point.bodyweightKg);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const innerWidth = width - HORIZONTAL_PADDING * 2;
  const innerHeight = height - VERTICAL_PADDING * 2;

  const points = sorted.map((point, index) => {
    const x =
      sorted.length === 1
        ? width / 2
        : HORIZONTAL_PADDING +
          (index / (sorted.length - 1)) * innerWidth;
    const normalizedY = (point.bodyweightKg - minValue) / valueRange;
    // Invert Y so larger values render higher.
    const y = VERTICAL_PADDING + (1 - normalizedY) * innerHeight;
    return { x, y, value: point.bodyweightKg };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <View>
      <Svg width={width} height={height}>
        {sorted.length > 1 ? (
          <Polyline
            points={polylinePoints}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
        ) : null}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={POINT_RADIUS}
            fill={STROKE}
          />
        ))}
      </Svg>
      <View className="mt-1 flex-row items-center justify-between px-2">
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {first ? formatWeight(first.value, units) : ""}
        </Text>
        <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {last ? formatWeight(last.value, units) : ""}
        </Text>
      </View>
    </View>
  );
}
