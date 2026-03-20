// Detection tuning parameters
export const DETECTION_CONFIG = {
  // Minimum contour area as a fraction of frame area to be considered a document
  MIN_DOCUMENT_AREA_RATIO: 0.05,
  // Minimum contour area as a fraction of frame area for labels (smaller objects)
  MIN_LABEL_AREA_RATIO: 0.01,
  // Maximum contour area ratio (reject if contour is basically the full frame)
  MAX_AREA_RATIO: 0.95,
  // Epsilon factor for polygon approximation (fraction of perimeter)
  APPROX_POLY_EPSILON_FACTOR: 0.02,
  // Canny edge detection thresholds
  CANNY_THRESHOLD_1: 50,
  CANNY_THRESHOLD_2: 150,
  // Gaussian blur kernel size
  BLUR_KERNEL_SIZE: 5,
  // Number of stable frames before auto-capture
  STABLE_FRAME_COUNT: 6,
  // Maximum pixel movement for a corner to be considered "stable"
  STABLE_THRESHOLD_PX: 8,
  // Target FPS for snapshot processing (lower = less CPU usage)
  PROCESSING_FPS: 2,
  // Downscale factor for processing (1 = full size, 2 = half, 4 = quarter)
  DOWNSCALE_FACTOR: 4,
} as const;
