import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { formatWeight, type WeightUnit } from "@fitness/shared";

type DataPoint = {
  finishedAt: number;
  topWeight: number;
  topReps: number;
};

type Props = {
  data: DataPoint[];
  units: WeightUnit;
  width: number;
  height?: number;
};

const PADDING_LEFT = 44;
const PADDING_RIGHT = 16;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;
const STROKE = "#0ea5e9";
const POINT_COLOR = "#0ea5e9";
const POINT_RADIUS_INACTIVE = 3.5;
const POINT_RADIUS_ACTIVE = 6;
const AXIS_COLOR = "#e5e5e5";
const AXIS_LABEL_COLOR = "#737373";

const formatShortDate = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export function WeightProgressChart({ data, units, width, height = 220 }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <View
        style={{ height, width }}
        className="items-center justify-center rounded-xl bg-neutral-50 dark:bg-neutral-900"
      >
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          No data yet
        </Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => a.finishedAt - b.finishedAt);
  const weights = sorted.map((p) => p.topWeight);
  const minRaw = Math.min(...weights);
  const maxRaw = Math.max(...weights);
  // Add 10% padding around values, clamp min to 0 if reasonable.
  const range = Math.max(maxRaw - minRaw, 1);
  const yMin = Math.max(0, minRaw - range * 0.1);
  const yMax = maxRaw + range * 0.1;
  const yRange = yMax - yMin || 1;

  const innerWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const points = sorted.map((point, index) => {
    const x =
      sorted.length === 1
        ? PADDING_LEFT + innerWidth / 2
        : PADDING_LEFT + (index / (sorted.length - 1)) * innerWidth;
    const normY = (point.topWeight - yMin) / yRange;
    const y = PADDING_TOP + (1 - normY) * innerHeight;
    return { x, y, point };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis ticks: 4 evenly spaced values across the data range.
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const fraction = i / (tickCount - 1);
    const value = yMin + fraction * yRange;
    const y = PADDING_TOP + (1 - fraction) * innerHeight;
    return { value, y };
  });

  // X-axis labels: just first and last date.
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;
  const showSingleX = sorted.length === 1;

  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y axis grid + labels */}
        {yTicks.map((tick, i) => (
          <Line
            key={`grid-${i}`}
            x1={PADDING_LEFT}
            y1={tick.y}
            x2={width - PADDING_RIGHT}
            y2={tick.y}
            stroke={AXIS_COLOR}
            strokeWidth={0.5}
          />
        ))}
        {yTicks.map((tick, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={PADDING_LEFT - 6}
            y={tick.y + 3}
            fill={AXIS_LABEL_COLOR}
            fontSize="10"
            textAnchor="end"
          >
            {formatWeight(tick.value, units)}
          </SvgText>
        ))}

        {/* Line */}
        {sorted.length > 1 ? (
          <Polyline
            points={polyline}
            stroke={STROKE}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Points */}
        {points.map((p, i) => (
          <Circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={
              activeIndex === i ? POINT_RADIUS_ACTIVE : POINT_RADIUS_INACTIVE
            }
            fill={POINT_COLOR}
          />
        ))}

        {/* X labels */}
        {showSingleX ? (
          <SvgText
            x={firstPoint.x}
            y={height - 8}
            fill={AXIS_LABEL_COLOR}
            fontSize="10"
            textAnchor="middle"
          >
            {formatShortDate(sorted[0]!.finishedAt)}
          </SvgText>
        ) : (
          <>
            <SvgText
              x={firstPoint.x}
              y={height - 8}
              fill={AXIS_LABEL_COLOR}
              fontSize="10"
              textAnchor="start"
            >
              {formatShortDate(sorted[0]!.finishedAt)}
            </SvgText>
            <SvgText
              x={lastPoint.x}
              y={height - 8}
              fill={AXIS_LABEL_COLOR}
              fontSize="10"
              textAnchor="end"
            >
              {formatShortDate(sorted[sorted.length - 1]!.finishedAt)}
            </SvgText>
          </>
        )}

        {/* Tap targets — wider invisible circles so points are easier to hit */}
        {points.map((p, i) => (
          <Circle
            key={`tap-${i}`}
            cx={p.x}
            cy={p.y}
            r={16}
            fill="transparent"
            onPress={() => setActiveIndex(i === activeIndex ? null : i)}
          />
        ))}
      </Svg>

      {activePoint ? (
        <View className="mt-2 rounded-lg bg-brand-50 dark:bg-brand-950/30 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {new Date(activePoint.point.finishedAt).toLocaleDateString(
              undefined,
              { weekday: "short", month: "short", day: "numeric" },
            )}
          </Text>
          <Text className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {formatWeight(activePoint.point.topWeight, units)} ×{" "}
            {activePoint.point.topReps} reps
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => setActiveIndex(0)}
          hitSlop={4}
          className="mt-2 self-center"
        >
          <Text className="text-xs italic text-neutral-500 dark:text-neutral-400">
            Tap a point to see details
          </Text>
        </Pressable>
      )}
    </View>
  );
}
