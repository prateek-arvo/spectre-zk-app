import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { DetectedCorners } from '../utils/contourUtils';

type Props = {
  corners: DetectedCorners | null;
  width: number;
  height: number;
  isStable: boolean;
};

/**
 * Draws a quadrilateral overlay on top of the camera preview
 * showing the detected document boundaries.
 * Uses absolute-positioned View elements since we can't use Skia
 * without the Skia frame processor (which has complex setup requirements).
 */
export function DetectionOverlay({ corners, width, height, isStable }: Props) {
  if (!corners || width === 0 || height === 0) return null;

  const color = isStable ? '#4CAF50' : '#FF9800';

  // Convert normalized coords to pixel positions
  const points = [
    { x: corners.topLeft.x * width, y: corners.topLeft.y * height },
    { x: corners.topRight.x * width, y: corners.topRight.y * height },
    { x: corners.bottomRight.x * width, y: corners.bottomRight.y * height },
    { x: corners.bottomLeft.x * width, y: corners.bottomLeft.y * height },
  ];

  // Draw corner markers and connecting lines using SVG-like views
  const cornerSize = 20;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      {/* Semi-transparent fill */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isStable
              ? 'rgba(76, 175, 80, 0.08)'
              : 'rgba(255, 152, 0, 0.05)',
          },
        ]}
      />

      {/* Corner markers */}
      {points.map((point, index) => (
        <View
          key={index}
          style={[
            styles.corner,
            {
              left: point.x - cornerSize / 2,
              top: point.y - cornerSize / 2,
              width: cornerSize,
              height: cornerSize,
              borderColor: color,
              backgroundColor: `${color}44`,
            },
          ]}
        />
      ))}

      {/* Edge lines between corners */}
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length]!;
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={`line-${index}`}
            style={[
              styles.line,
              {
                left: point.x,
                top: point.y,
                width: length,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 4,
  },
  line: {
    position: 'absolute',
    height: 2.5,
    transformOrigin: 'left center',
  },
});
