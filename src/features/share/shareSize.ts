import { PixelRatio } from 'react-native';

/** Size of the exported share image in pixels (4:5, Instagram portrait). */
export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;

/**
 * Layout width (in points/dp) at which the off-screen ShareCard is rendered for
 * capture. Captured at the device's pixel ratio, that is exactly
 * SHARE_IMAGE_WIDTH pixels: 360pt on a 3x iPhone, 540pt on a 2x one. Capturing
 * at the natural size avoids relying on react-native-view-shot's resizing,
 * which iOS doesn't do when rendering with `renderInContext`.
 */
export const SHARE_CAPTURE_WIDTH = SHARE_IMAGE_WIDTH / PixelRatio.get();
