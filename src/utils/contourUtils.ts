import { OpenCV, ObjectType } from 'react-native-fast-opencv';
import { ColorConversionCodes } from 'react-native-fast-opencv';
import {
  ContourApproximationModes,
  RetrievalModes,
  MorphShapes,
} from 'react-native-fast-opencv';
import { DETECTION_CONFIG } from '../constants/detection';
import type { PointVector } from 'react-native-fast-opencv';

export type DetectedCorners = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
};

/**
 * Order 4 points clockwise starting from top-left.
 */
function orderPoints(
  points: { x: number; y: number }[]
): DetectedCorners | null {
  if (points.length !== 4) return null;

  // Sort by y to get top two and bottom two
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const topTwo = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottomTwo = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return {
    topLeft: topTwo[0]!,
    topRight: topTwo[1]!,
    bottomLeft: bottomTwo[0]!,
    bottomRight: bottomTwo[1]!,
  };
}

/**
 * Detect a document/label quadrilateral from a base64-encoded image.
 * Returns normalized corners (0-1 range) or null if no document found.
 */
export function detectDocumentFromBase64(
  base64Image: string,
  mode: 'document' | 'label' = 'document'
): DetectedCorners | null {
  const minAreaRatio =
    mode === 'document'
      ? DETECTION_CONFIG.MIN_DOCUMENT_AREA_RATIO
      : DETECTION_CONFIG.MIN_LABEL_AREA_RATIO;

  // Load image from base64
  const src = OpenCV.base64ToMat(base64Image);
  const srcInfo = OpenCV.toJSValue(src);
  const width = srcInfo.cols;
  const height = srcInfo.rows;

  // Downscale for faster processing
  const scale = DETECTION_CONFIG.DOWNSCALE_FACTOR;
  const smallWidth = Math.floor(width / scale);
  const smallHeight = Math.floor(height / scale);
  const smallSize = OpenCV.createObject(
    ObjectType.Size,
    smallWidth,
    smallHeight
  );
  const small = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke('resize', src, small, smallSize, 0, 0, 1);

  // Convert to grayscale
  const gray = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke('cvtColor', small, gray, ColorConversionCodes.COLOR_RGBA2GRAY);

  // Gaussian blur to reduce noise
  const blurred = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  const ksize = OpenCV.createObject(
    ObjectType.Size,
    DETECTION_CONFIG.BLUR_KERNEL_SIZE,
    DETECTION_CONFIG.BLUR_KERNEL_SIZE
  );
  OpenCV.invoke('GaussianBlur', gray, blurred, ksize, 0);

  // Canny edge detection
  const edges = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke(
    'Canny',
    blurred,
    edges,
    DETECTION_CONFIG.CANNY_THRESHOLD_1,
    DETECTION_CONFIG.CANNY_THRESHOLD_2
  );

  // Dilate to close gaps in edges
  const dilateKernel = OpenCV.invoke(
    'getStructuringElement',
    MorphShapes.MORPH_RECT,
    OpenCV.createObject(ObjectType.Size, 3, 3)
  );
  const dilated = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke(
    'dilate',
    edges,
    dilated,
    dilateKernel,
    OpenCV.createObject(ObjectType.Point, -1, -1),
    1,
    0,
    OpenCV.createObject(ObjectType.Scalar, 0)
  );

  // Find contours
  const contours = OpenCV.createObject(ObjectType.PointVectorOfVectors);
  OpenCV.invoke(
    'findContours',
    dilated,
    contours,
    RetrievalModes.RETR_LIST,
    ContourApproximationModes.CHAIN_APPROX_SIMPLE
  );

  const contoursData = OpenCV.toJSValue(contours);
  const frameArea = smallWidth * smallHeight;
  const minArea = frameArea * minAreaRatio;
  const maxArea = frameArea * DETECTION_CONFIG.MAX_AREA_RATIO;

  let bestQuad: { x: number; y: number }[] | null = null;
  let bestArea = 0;

  for (let i = 0; i < contoursData.array.length; i++) {
    const contour = OpenCV.copyObjectFromVector(contours, i) as PointVector;
    const area = OpenCV.invoke('contourArea', contour);

    if (area.value < minArea || area.value > maxArea) continue;

    const peri = OpenCV.invoke('arcLength', contour, true);
    const approx = OpenCV.createObject(ObjectType.PointVector);
    OpenCV.invoke(
      'approxPolyDP',
      contour,
      approx,
      DETECTION_CONFIG.APPROX_POLY_EPSILON_FACTOR * peri.value,
      true
    );

    const approxPoints = OpenCV.toJSValue(approx);

    if (approxPoints.array.length === 4) {
      const isConvex = OpenCV.invoke('isContourConvex', approx as any);

      if (isConvex.value && area.value > bestArea) {
        bestArea = area.value;
        bestQuad = approxPoints.array;
      }
    }
  }

  OpenCV.clearBuffers();

  if (!bestQuad) return null;

  // Scale corners back to original coordinates and normalize to 0-1
  const ordered = orderPoints(
    bestQuad.map((p) => ({
      x: (p.x * scale) / width,
      y: (p.y * scale) / height,
    }))
  );

  return ordered;
}
