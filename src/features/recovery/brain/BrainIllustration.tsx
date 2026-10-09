import { useId } from 'react';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { sulci, type Pt } from './brainGeometry';

/** Illustration coordinate space; region x/y (0..1) map onto it. */
export const BRAIN_VIEWBOX = { width: 400, height: 300 } as const;

// Side view, front of the brain facing left. The cerebrum silhouette is filled by
// four lobe paths (frontal, parietal, occipital, temporal) whose shared edges run
// exactly along the fissures drawn on top, so the color change reads as anatomy
// instead of a seam.
const CEREBRUM =
  'M 52 178 C 30 150, 30 104, 68 74 C 102 46, 156 26, 214 26 C 274 26, 332 48, 358 92 C 382 130, 386 174, 364 200 ' +
  'C 352 214, 334 220, 316 222 C 300 230, 270 238, 236 238 C 190 238, 150 230, 132 218 ' +
  'C 120 210, 114 202, 120 196 C 122 192, 126 190, 132 189 C 110 194, 74 198, 52 178 Z';
const CEREBELLUM =
  'M 262 218 C 274 198, 314 190, 348 198 C 376 206, 384 236, 366 254 C 346 272, 296 272, 272 258 C 256 248, 252 232, 262 218 Z';
const BRAINSTEM =
  'M 222 208 C 244 200, 268 206, 274 224 C 280 246, 272 270, 270 298 L 240 298 C 238 280, 226 264, 216 250 C 208 234, 210 214, 222 208 Z';

// Lobe boundaries (cubic segments, reused forwards and backwards by the lobe paths).
/** Central sulcus: frontal | parietal. */
const CENTRAL = 'M 230 27 C 226 50, 222 62, 218 80 C 214 98, 206 112, 204 128 C 202 144, 196 154, 191 167';
const CENTRAL_REV = 'C 196 154, 202 144, 204 128 C 206 112, 214 98, 218 80 C 222 62, 226 50, 230 27';
/** Lateral (Sylvian) fissure: frontal + parietal | temporal. */
const SYLVIAN = 'M 132 189 C 150 179, 170 172, 191 167 C 206 163, 220 160, 232 156 C 250 150, 264 142, 278 134';
const SYLVIAN_FRONT_REV = 'C 170 172, 150 179, 132 189';
const SYLVIAN_BACK_REV = 'C 264 142, 250 150, 232 156 C 220 160, 206 163, 191 167';
/** Parietal | temporal, from the end of the fissure back to the occipital line. */
const TEMPORO_PARIETAL = 'M 278 134 C 296 146, 306 142, 328 156';
/** Parieto-occipital line, from the top down to the preoccipital notch. */
const OCCIPITAL_LINE = 'M 340 40 C 330 78, 340 118, 328 156 C 318 182, 326 204, 316 224';

const LOBE_PATHS = {
  frontal: `M -10 -10 L 232 -10 L 230 27 ${CENTRAL.slice('M 230 27 '.length)} ${SYLVIAN_FRONT_REV} L 118 194 L -10 197 Z`,
  parietal:
    'M 232 -10 L 342 -10 L 340 40 C 330 78, 340 118, 328 156 C 306 142, 296 146, 278 134 ' + `${SYLVIAN_BACK_REV} ${CENTRAL_REV} Z`,
  occipital: 'M 342 -10 L 410 -10 L 410 310 L 316 310 L 316 224 C 326 204, 318 182, 328 156 C 340 118, 330 78, 340 40 Z',
  temporal: `M -10 197 L 118 194 L 132 189 ${SYLVIAN.slice('M 132 189 '.length)} ${TEMPORO_PARIETAL.slice('M 278 134 '.length)} ${OCCIPITAL_LINE.split(' 328 156 ')[1]} L 316 310 L -10 310 Z`,
} as const;

type Lobe = keyof typeof LOBE_PATHS;

/** Lobe fills: one hue family (pink-beige tissue), distinct enough to tell the lobes apart. */
const LOBE_FILLS: Record<Lobe, readonly [string, string, string]> = {
  frontal: ['#F6C5B7', '#E09B8B', '#A6645A'],
  parietal: ['#F6D5C0', '#E1AE93', '#A97059'],
  occipital: ['#E5A498', '#C67D70', '#8A4A43'],
  temporal: ['#EEB3A1', '#D18877', '#91514A'],
};
const LOBES = Object.keys(LOBE_PATHS) as Lobe[];

const SYLVIAN_RAMI = ['M 278 134 C 288 126, 298 122, 310 118', 'M 172 171 C 168 162, 173 154, 170 144'];

const MAIN = { amp: 2.8, wavelength: 30 };
const MINOR = { amp: 2.4, wavelength: 24 };

const CORTEX_SULCI = sulci(
  [
    // Precentral + postcentral sulci (the central sulcus is a lobe boundary, drawn separately)
    { points: [[200, 30], [194, 60], [187, 92]], opts: MINOR },
    { points: [[182, 106], [174, 134], [168, 156]], opts: MINOR },
    { points: [[258, 34], [253, 66], [246, 98], [238, 128]], opts: MAIN },
    // Frontal lobe: superior + inferior frontal sulci and tertiary grooves
    { points: [[186, 62], [160, 70], [132, 76], [104, 86], [76, 100]], opts: MAIN },
    { points: [[178, 104], [152, 110], [124, 118], [94, 128], [60, 140]], opts: MAIN },
    { points: [[156, 50], [128, 46], [100, 58]], opts: MINOR },
    { points: [[150, 150], [124, 152], [96, 160], [70, 170]], opts: MINOR },
    { points: [[70, 80], [56, 96], [46, 116]], opts: MINOR },
    { points: [[120, 132], [100, 140], [78, 148]], opts: MINOR },
    { points: [[166, 86], [144, 92], [118, 98], [94, 106]], opts: MINOR },
    { points: [[112, 60], [96, 70], [84, 82]], opts: MINOR },
    { points: [[62, 116], [52, 134], [50, 152]], opts: MINOR },
    { points: [[142, 128], [158, 134], [160, 146]], opts: MINOR },
    { points: [[186, 40], [168, 42], [150, 34]], opts: MINOR },
    // Parietal lobe: intraparietal sulcus, supramarginal + angular gyri
    { points: [[250, 108], [276, 102], [302, 98], [326, 96]], opts: MAIN },
    { points: [[280, 42], [290, 62], [300, 80]], opts: MINOR },
    { points: [[312, 50], [318, 68], [322, 82]], opts: MINOR },
    { points: [[292, 118], [310, 126], [316, 140]], opts: MINOR },
    { points: [[268, 70], [262, 88], [268, 100]], opts: MINOR },
    { points: [[226, 118], [220, 136], [224, 150]], opts: MINOR },
    { points: [[244, 142], [262, 130], [280, 124]], opts: MINOR },
    // Parieto-occipital sulcus notch at the top of the lobe line
    { points: [[340, 44], [336, 62]], opts: MINOR },
    // Occipital lobe: lateral occipital sulci
    { points: [[368, 106], [356, 124], [358, 146], [366, 166]], opts: MINOR },
    { points: [[350, 74], [346, 90]], opts: MINOR },
    { points: [[336, 182], [348, 194], [354, 206]], opts: MINOR },
    // Temporal lobe: superior + inferior temporal sulci
    { points: [[146, 204], [180, 192], [216, 186], [252, 178], [290, 174], [318, 182]], opts: MAIN },
    { points: [[160, 222], [196, 215], [232, 217], [268, 211], [300, 212]], opts: MINOR },
    { points: [[296, 190], [306, 202], [312, 214]], opts: MINOR },
    { points: [[186, 228], [206, 232], [226, 230]], opts: MINOR },
    { points: [[248, 226], [268, 224], [288, 228]], opts: MINOR },
  ],
  11,
);

const FOLIA_LINES: Pt[][] = [
  [[268, 216], [300, 206], [340, 206], [372, 220]],
  [[262, 228], [300, 218], [342, 218], [378, 232]],
  [[262, 240], [300, 230], [344, 230], [378, 244]],
  [[268, 252], [304, 244], [342, 244], [370, 254]],
  [[284, 263], [312, 258], [340, 258], [358, 264]],
];
const FOLIA = sulci(
  FOLIA_LINES.map((points) => ({ points, opts: { amp: 0.9, wavelength: 9 } })),
  201,
);

const STEM_LINES = ['M 214 240 C 232 232, 254 234, 274 242', 'M 236 272 C 248 270, 258 270, 270 272'];

const GROOVE = '#7A3530';
const GROOVE_CORE = '#4A1814';
const SHADOW = '#4A1A16';
const HIGHLIGHT = '#FFF0E6';
const EDGE = '#5A2622';

export interface BrainIllustrationProps {
  width?: number | string;
  height?: number | string;
  /** Simplified rendering for small sizes (fewer details). */
  mini?: boolean;
}

/**
 * Stylized anatomical side view of the brain (frontal, parietal, temporal and
 * occipital lobes, cerebellum and brainstem) with soft shading and rounded gyri.
 */
export function BrainIllustration({ width = '100%', height = '100%', mini }: BrainIllustrationProps) {
  // Gradient/clip ids must be unique per instance (web shares one DOM across screens).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${name}${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  /**
   * A groove between two gyri: a soft wide shadow, the groove itself, a thin dark
   * core and a lit lower lip (light comes from the top left), so the folds read
   * as rounded instead of as cracks.
   */
  const grooves = (paths: string[], key: string, scale = 1) => (
    <G key={key}>
      {!mini &&
        paths.map((d, i) => (
          <Path key={`o${i}`} d={d} stroke={SHADOW} strokeOpacity={0.13} strokeWidth={7.5 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      {!mini &&
        paths.map((d, i) => (
          <Path key={`h${i}`} d={d} stroke={HIGHLIGHT} strokeOpacity={0.3} strokeWidth={1.6 * scale} fill="none" strokeLinecap="round" transform={`translate(${0.5 * scale} ${2.5 * scale})`} />
        ))}
      {paths.map((d, i) => (
        <Path key={`s${i}`} d={d} stroke={GROOVE} strokeOpacity={mini ? 0.55 : 0.4} strokeWidth={(mini ? 4.5 : 3.6) * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {!mini &&
        paths.map((d, i) => (
          <Path key={`c${i}`} d={d} stroke={GROOVE_CORE} strokeOpacity={0.32} strokeWidth={1.1 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
    </G>
  );

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${BRAIN_VIEWBOX.width} ${BRAIN_VIEWBOX.height}`}>
      <Defs>
        {LOBES.map((lobe) => (
          <LinearGradient key={lobe} id={id(`lobe${lobe}`)} x1="0.3" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={LOBE_FILLS[lobe][0]} />
            <Stop offset="0.55" stopColor={LOBE_FILLS[lobe][1]} />
            <Stop offset="1" stopColor={LOBE_FILLS[lobe][2]} />
          </LinearGradient>
        ))}
        <LinearGradient id={id('cerebellum')} x1="0.3" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#D69C8C" />
          <Stop offset="1" stopColor="#874840" />
        </LinearGradient>
        <LinearGradient id={id('stem')} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#C98D7F" />
          <Stop offset="0.7" stopColor="#8A4C44" />
          <Stop offset="1" stopColor="#6E3A34" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={id('shade')} cx="0.36" cy="0.24" r="0.82" fx="0.36" fy="0.24">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="0.36" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.76" stopColor="#3A1512" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#2A0D0B" stopOpacity={0.55} />
        </RadialGradient>
        <RadialGradient id={id('floor')} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={id('clipCerebrum')}>
          <Path d={CEREBRUM} />
        </ClipPath>
        <ClipPath id={id('clipCerebellum')}>
          <Path d={CEREBELLUM} />
        </ClipPath>
        <ClipPath id={id('clipStem')}>
          <Path d={BRAINSTEM} />
        </ClipPath>
      </Defs>

      {!mini && <Ellipse cx={215} cy={288} rx={150} ry={12} fill={url('floor')} />}

      {/* Brainstem (behind) */}
      <Path d={BRAINSTEM} fill={url('stem')} />
      <Path d={BRAINSTEM} fill={url('shade')} />
      {!mini && <G clipPath={url('clipStem')}>{grooves(STEM_LINES, 'stem', 0.8)}</G>}

      {/* Cerebellum */}
      <Path d={CEREBELLUM} fill={url('cerebellum')} />
      <G clipPath={url('clipCerebellum')}>{grooves(mini ? FOLIA.slice(0, 3) : FOLIA, 'folia', 0.6)}</G>
      <Path d={CEREBELLUM} fill={url('shade')} />
      <Path d={CEREBELLUM} fill="none" stroke={EDGE} strokeOpacity={0.55} strokeWidth={1.4} />

      {/* Cerebrum: lobes, gyri, lobe boundaries + fissure, shading */}
      <G clipPath={url('clipCerebrum')}>
        {LOBES.map((lobe) => (
          <Path key={lobe} d={LOBE_PATHS[lobe]} fill={url(`lobe${lobe}`)} />
        ))}
        {/* Imaginary lobe lines (no deep groove in reality): soft seams only. */}
        {[TEMPORO_PARIETAL, OCCIPITAL_LINE].map((d, i) => (
          <Path key={`seam${i}`} d={d} stroke={SHADOW} strokeOpacity={0.16} strokeWidth={mini ? 4 : 6} fill="none" strokeLinecap="round" />
        ))}
        {grooves(mini ? CORTEX_SULCI.filter((_, i) => i % 3 === 0) : CORTEX_SULCI, 'cortex')}
        {grooves([CENTRAL], 'central', 1.25)}
        {/* The frontal/parietal operculum overhangs the temporal lobe: soft shadow under the fissure. */}
        <Path d={SYLVIAN} stroke="#3A1210" strokeOpacity={0.22} strokeWidth={12} fill="none" strokeLinecap="round" transform="translate(0 5)" />
        <Path d={SYLVIAN} stroke={EDGE} strokeOpacity={0.85} strokeWidth={mini ? 5 : 3.6} fill="none" strokeLinecap="round" />
        {!mini && <Path d={SYLVIAN} stroke={HIGHLIGHT} strokeOpacity={0.4} strokeWidth={1.4} fill="none" strokeLinecap="round" transform="translate(0 -2.6)" />}
        {SYLVIAN_RAMI.map((d, i) => (
          <Path key={`ra${i}`} d={d} stroke={EDGE} strokeOpacity={0.6} strokeWidth={mini ? 4 : 2.8} fill="none" strokeLinecap="round" />
        ))}
      </G>
      <Path d={CEREBRUM} fill={url('shade')} />
      <Path d={CEREBRUM} fill="none" stroke={EDGE} strokeOpacity={0.5} strokeWidth={1.4} />
    </Svg>
  );
}
