import { OpenCV, ObjectType } from 'react-native-fast-opencv';
import { DecompTypes, BorderTypes } from 'react-native-fast-opencv';
import { InterpolationFlags } from 'react-native-fast-opencv';
import { ColorConversionCodes } from 'react-native-fast-opencv';
import type { DetectedCorners } from './contourUtils';

/**
 * Perform a perspective crop on an image using 4 corner points.
 * Takes a base64 image and normalized corner coordinates (0-1 range).
 * Returns the cropped image as a base64 string.
 */
export function perspectiveCrop(
  base64Image: string,
  corners: DetectedCorners,
  outputFormat: 'jpeg' | 'png' = 'jpeg'
): string {
  // Load image into OpenCV Mat
  const src = OpenCV.base64ToMat(base64Image);
  const srcInfo = OpenCV.toJSValue(src);
  const imgWidth = srcInfo.cols;
  const imgHeight = srcInfo.rows;

  // Convert normalized corners to pixel coordinates
  const tl = {
    x: corners.topLeft.x * imgWidth,
    y: corners.topLeft.y * imgHeight,
  };
  const tr = {
    x: corners.topRight.x * imgWidth,
    y: corners.topRight.y * imgHeight,
  };
  const br = {
    x: corners.bottomRight.x * imgWidth,
    y: corners.bottomRight.y * imgHeight,
  };
  const bl = {
    x: corners.bottomLeft.x * imgWidth,
    y: corners.bottomLeft.y * imgHeight,
  };

  // Calculate output dimensions from the max width and height of the quad
  const widthTop = Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
  const widthBottom = Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2);
  const outWidth = Math.round(Math.max(widthTop, widthBottom));

  const heightLeft = Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2);
  const heightRight = Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2);
  const outHeight = Math.round(Math.max(heightLeft, heightRight));

  // Create source points
  const srcPoints = OpenCV.createObject(ObjectType.PointVector);
  OpenCV.addObjectToVector(
    srcPoints,
    OpenCV.createObject(ObjectType.Point, Math.round(tl.x), Math.round(tl.y))
  );
  OpenCV.addObjectToVector(
    srcPoints,
    OpenCV.createObject(ObjectType.Point, Math.round(tr.x), Math.round(tr.y))
  );
  OpenCV.addObjectToVector(
    srcPoints,
    OpenCV.createObject(ObjectType.Point, Math.round(br.x), Math.round(br.y))
  );
  OpenCV.addObjectToVector(
    srcPoints,
    OpenCV.createObject(ObjectType.Point, Math.round(bl.x), Math.round(bl.y))
  );

  // Create destination points (rectangle)
  const dstPoints = OpenCV.createObject(ObjectType.PointVector);
  OpenCV.addObjectToVector(
    dstPoints,
    OpenCV.createObject(ObjectType.Point, 0, 0)
  );
  OpenCV.addObjectToVector(
    dstPoints,
    OpenCV.createObject(ObjectType.Point, outWidth - 1, 0)
  );
  OpenCV.addObjectToVector(
    dstPoints,
    OpenCV.createObject(ObjectType.Point, outWidth - 1, outHeight - 1)
  );
  OpenCV.addObjectToVector(
    dstPoints,
    OpenCV.createObject(ObjectType.Point, 0, outHeight - 1)
  );

  // Get perspective transform matrix
  const M = OpenCV.invoke(
    'getPerspectiveTransform',
    srcPoints,
    dstPoints,
    DecompTypes.DECOMP_LU
  );

  // Apply perspective warp
  const dst = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  const outSize = OpenCV.createObject(ObjectType.Size, outWidth, outHeight);
  OpenCV.invoke(
    'warpPerspective',
    src,
    dst,
    M,
    outSize,
    InterpolationFlags.INTER_LINEAR,
    BorderTypes.BORDER_CONSTANT,
    OpenCV.createObject(ObjectType.Scalar, 0, 0, 0)
  );

  // Convert to output format and get base64
  const result = OpenCV.toJSValue(dst, outputFormat);

  // Clean up
  OpenCV.clearBuffers();

  return result.base64;
}

/**
 * Apply adaptive threshold to make the image look like a scanned document.
 */
export function applyDocumentFilter(base64Image: string): string {
  const src = OpenCV.base64ToMat(base64Image);

  // Convert to grayscale
  const gray = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke('cvtColor', src, gray, ColorConversionCodes.COLOR_RGBA2GRAY);

  // Apply adaptive threshold for scanned look
  const thresh = OpenCV.createObject(ObjectType.Mat, 1, 1, 0);
  OpenCV.invoke('adaptiveThreshold', gray, thresh, 255, 0, 0, 11, 8);

  const result = OpenCV.toJSValue(thresh, 'jpeg');
  OpenCV.clearBuffers();

  return result.base64;
}
