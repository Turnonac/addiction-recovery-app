import type { ComponentType, ReactNode } from 'react';
import { View, type ColorValue } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@/ui/theme';

/**
 * Line icons drawn on a 24x24 grid (paths match the approved mockups).
 * Icons are decorative (hidden from screen readers) unless `accessibilityLabel`
 * is given; put the meaning in the surrounding control's label instead.
 */
export interface IconProps {
  /** Width and height in points. Default 24. */
  size?: number;
  /** Stroke color. Default: theme text color. */
  color?: ColorValue;
  /** Stroke width on the 24-unit grid. Each icon has its own default. */
  strokeWidth?: number;
  /** Makes the icon a labelled image for screen readers. Omit for decorative icons. */
  accessibilityLabel?: string;
}

export type IconComponent = ComponentType<IconProps>;

interface IconBaseProps extends IconProps {
  defaultStrokeWidth: number;
  children: ReactNode;
}

function IconBase({
  size = 24,
  color,
  strokeWidth,
  accessibilityLabel,
  defaultStrokeWidth,
  children,
}: IconBaseProps) {
  const theme = useAppTheme();
  const labelled = accessibilityLabel !== undefined;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
    >
      <G
        fill="none"
        stroke={color ?? theme.text}
        strokeWidth={strokeWidth ?? defaultStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </G>
    </Svg>
  );
}

/** Today tab. */
export function Sun(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2} {...props}>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </IconBase>
  );
}

/** History tab. */
export function Calendar(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2} {...props}>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </IconBase>
  );
}

/** Settings tab. */
export function Sliders(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2} {...props}>
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </IconBase>
  );
}

export function Phone(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2} {...props}>
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </IconBase>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2.4} {...props}>
      <Path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2.4} {...props}>
      <Path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={3} {...props}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </IconBase>
  );
}

export function Plus(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2.4} {...props}>
      <Path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

/** Short dash, used for "no call" under a day. */
export function Minus(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={3} {...props}>
      <Path d="M8 12h8" />
    </IconBase>
  );
}

export function Lock(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2.4} {...props}>
      <Rect x={5} y={11} width={14} height={10} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconBase>
  );
}

export function Users(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2} {...props}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function X(props: IconProps) {
  return (
    <IconBase defaultStrokeWidth={2.4} {...props}>
      <Path d="M18 6 6 18M6 6l12 12" />
    </IconBase>
  );
}

// `...Icon` aliases, for call sites that prefer suffixed names.
export {
  Calendar as CalendarIcon,
  Check as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Lock as LockIcon,
  Minus as MinusIcon,
  Phone as PhoneIcon,
  Plus as PlusIcon,
  Sliders as SlidersIcon,
  Sun as SunIcon,
  Users as UsersIcon,
  X as XIcon,
};

export type TabName = 'today' | 'history' | 'settings';

export interface TabIconProps {
  /** 'today' = Sun, 'history' = Calendar, 'settings' = Sliders. */
  name: TabName;
  focused: boolean;
  /** Tint passed by the tab bar (`tabBarIcon({ color })`). */
  color: ColorValue;
  size?: number;
}

/**
 * Tab bar icon with the mockup's soft pill behind the focused tab.
 * Use as `tabBarIcon: ({ focused, color }) => <TabIcon name="today" focused={focused} color={color} />`.
 * The pill is 56x30; it draws past the default icon box, which is fine because
 * the whole tab item is the touch target.
 */
export function TabIcon({ name, focused, color, size = 24 }: TabIconProps) {
  const theme = useAppTheme();
  let icon: ReactNode;
  switch (name) {
    case 'today':
      icon = <Sun size={size} color={color} />;
      break;
    case 'history':
      icon = <Calendar size={size} color={color} />;
      break;
    case 'settings':
      icon = <Sliders size={size} color={color} />;
      break;
  }
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: focused ? theme.accentSoft : 'transparent',
      }}
    >
      {icon}
    </View>
  );
}
