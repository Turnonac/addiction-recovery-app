// Shared presentational components. Data comes in through props only (no store
// access); colors come from useAppTheme(). Icons live in '@/ui/icons'.

export { Avatar, type AvatarProps } from '@/ui/components/Avatar';
export {
  BackButton,
  Button,
  type BackButtonProps,
  type ButtonProps,
  type ButtonVariant,
} from '@/ui/components/Button';
export { Card, StatTile, type CardProps, type StatTileProps } from '@/ui/components/Card';
export {
  AddChip,
  Chip,
  ChipList,
  type AddChipProps,
  type ChipListProps,
  type ChipProps,
} from '@/ui/components/Chip';
export {
  ColorDots,
  ColorGlyph,
  colorLabel,
  type ColorDotsProps,
  type ColorGlyphProps,
} from '@/ui/components/ColorGlyph';
export {
  ColorOptionCard,
  ColorOptionGroup,
  type ColorOptionCardProps,
  type ColorOptionGroupProps,
} from '@/ui/components/ColorOptionCard';
export { ColorTotals, type ColorTotalsProps } from '@/ui/components/ColorTotals';
export {
  MonthCalendar,
  type MonthCalendarCell,
  type MonthCalendarProps,
} from '@/ui/components/MonthCalendar';
export { NotificationPreview, type NotificationPreviewProps } from '@/ui/components/NotificationPreview';
export {
  MODAL_EDGES,
  Screen,
  ScreenHeader,
  type ScreenEdge,
  type ScreenHeaderProps,
  type ScreenProps,
} from '@/ui/components/Screen';
export { SectionHeader, type SectionHeaderProps } from '@/ui/components/SectionHeader';
export {
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  type SettingsGroupProps,
  type SettingsNoteProps,
  type SettingsRowProps,
} from '@/ui/components/SettingsRow';
export { StepProgress, type StepProgressProps } from '@/ui/components/StepProgress';
export { TextField, type TextFieldProps } from '@/ui/components/TextField';
export { ToggleRow, type ToggleRowProps } from '@/ui/components/ToggleRow';
export { WeekStrip, type WeekStripDayItem, type WeekStripProps } from '@/ui/components/WeekStrip';
