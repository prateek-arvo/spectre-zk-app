import { useCallback, useEffect, useRef, useState } from 'react';
import { detectDocumentFromBase64, type DetectedCorners } from '../utils/contourUtils';
import { DETECTION_CONFIG } from '../constants/detection';
import type { Camera } from 'react-native-vision-camera';
import { File } from 'expo-file-system';

export type DetectionState = {
  corners: DetectedCorners | null;
  status: 'searching' | 'detected' | 'stable';
  stableCount: number;
};

function cornersDistance(
  a: DetectedCorners | null,
  b: DetectedCorners | null
): number {
  if (!a || !b) return Infinity;

  const dx1 = a.topLeft.x - b.topLeft.x;
  const dy1 = a.topLeft.y - b.topLeft.y;
  const dx2 = a.topRight.x - b.topRight.x;
  const dy2 = a.topRight.y - b.topRight.y;
  const dx3 = a.bottomRight.x - b.bottomRight.x;
  const dy3 = a.bottomRight.y - b.bottomRight.y;
  const dx4 = a.bottomLeft.x - b.bottomLeft.x;
  const dy4 = a.bottomLeft.y - b.bottomLeft.y;

  return Math.max(
    Math.sqrt(dx1 * dx1 + dy1 * dy1),
    Math.sqrt(dx2 * dx2 + dy2 * dy2),
    Math.sqrt(dx3 * dx3 + dy3 * dy3),
    Math.sqrt(dx4 * dx4 + dy4 * dy4)
  );
}

export function useDocumentDetection(
  mode: 'document' | 'label' = 'document',
  cameraRef: React.RefObject<Camera | null>,
  isActive: boolean
) {
  const [detectionState, setDetectionState] = useState<DetectionState>({
    corners: null,
    status: 'searching',
    stableCount: 0,
  });

  const prevCornersRef = useRef<DetectedCorners | null>(null);
  const stableCountRef = useRef(0);
  const processingRef = useRef(false);

  const stableThresholdNorm =
    DETECTION_CONFIG.STABLE_THRESHOLD_PX /
    (1080 / DETECTION_CONFIG.DOWNSCALE_FACTOR);

  const processSnapshot = useCallback(async () => {
    if (processingRef.current || !cameraRef.current || !isActive) return;
    processingRef.current = true;

    try {
      // Take a low-quality snapshot (GPU screenshot on Android - fast)
      const snapshot = await cameraRef.current.takeSnapshot({ quality: 30 });
      const filePath = snapshot.path.startsWith('file://')
        ? snapshot.path
        : 'file://' + snapshot.path;

      // Read as base64 using expo-file-system File API
      const snapshotFile = new File(filePath);
      const base64 = await snapshotFile.base64();

      // Run detection
      const corners = detectDocumentFromBase64(base64, mode);
      const prevCorners = prevCornersRef.current;

      if (!corners) {
        stableCountRef.current = 0;
        prevCornersRef.current = null;
        setDetectionState({
          corners: null,
          status: 'searching',
          stableCount: 0,
        });
      } else {
        const dist = cornersDistance(prevCorners, corners);

        if (dist < stableThresholdNorm) {
          stableCountRef.current += 1;
        } else {
          stableCountRef.current = 1;
        }

        prevCornersRef.current = corners;

        const isStable =
          stableCountRef.current >= DETECTION_CONFIG.STABLE_FRAME_COUNT;

        setDetectionState({
          corners,
          status: isStable ? 'stable' : 'detected',
          stableCount: stableCountRef.current,
        });
      }

      // Clean up snapshot file
      try { await snapshotFile.delete(); } catch {}
    } catch {
      // Snapshot can fail during transitions, silently ignore
    } finally {
      processingRef.current = false;
    }
  }, [cameraRef, isActive, mode, stableThresholdNorm]);

  // Run detection loop
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(
      processSnapshot,
      1000 / DETECTION_CONFIG.PROCESSING_FPS
    );

    return () => clearInterval(interval);
  }, [isActive, processSnapshot]);

  const resetDetection = useCallback(() => {
    stableCountRef.current = 0;
    prevCornersRef.current = null;
    setDetectionState({
      corners: null,
      status: 'searching',
      stableCount: 0,
    });
  }, []);

  return {
    detectionState,
    resetDetection,
  };
}
