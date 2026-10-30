import { useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/ui/theme';

export type ScreenEdge = 'top' | 'bottom';

/**
 * Edges for routes opened with presentation 'modal'. iOS shows them as a sheet
 * below the status bar, but the stack's safe-area insets still report the full
 * status-bar height there, so only the bottom inset applies. Android modals are
 * full screen and need both.
 */
export const MODAL_EDGES: readonly ScreenEdge[] =
  Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom'];

export interface ScreenProps {
  children?: ReactNode;
  /** Scroll the content (default true). */
  scroll?: boolean;
  /**
   * Safe-area edges to pad. Default ['top'], right for tab screens (the tab bar
   * already clears the home indicator). Use ['top', 'bottom'] for modals and
   * onboarding without a footer. A `footer` always clears the bottom inset
   * when 'bottom' is listed.
   */
  edges?: readonly ScreenEdge[];
  /**
   * Pinned bar under the content (save / call buttons), with a top hairline.
   * Capped at FOOTER_MAX_HEIGHT of the screen; taller footers (very large text
   * sizes) scroll, so neither the content nor the footer's last button is lost.
   */
  footer?: ReactNode;
  /** Vertical space between children. Default 14. */
  gap?: number;
  /** Standard 20pt side padding (default true). */
  padded?: boolean;
  /**
   * Wrap in a KeyboardAvoidingView (screens with text fields). On iOS the body
   * also scrolls the focused field into view above the footer.
   */
  avoidKeyboard?: boolean;
  /** Extra style for the content container. */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Share of the screen a footer may take before it scrolls. */
const FOOTER_MAX_HEIGHT = '55%';

/** Room kept between a focused text field and the footer (or keyboard) on iOS. */
const FOCUSED_INPUT_GAP = 16;

/** Body scroll view's visible height and offset, kept from its own events. */
interface ScrollMetrics {
  height: number;
  offset: number;
}

/**
 * iOS: scroll the body so the focused text field sits just above the footer.
 * The 'padding' KeyboardAvoidingView only lifts the footer over the keyboard and
 * never scrolls, so a field low on the page stays hidden. Only scrolls down, and
 * never past the field's top; a field outside this scroll view fails to measure.
 */
function revealFocusedInput(scrollView: ScrollViewInstance | null, metrics: ScrollMetrics) {
  const input = TextInput.State.currentlyFocusedInput();
  const content = scrollView?.getInnerViewRef();
  if (!scrollView || !input || !content || metrics.height <= 0) return;
  input.measureLayout(content, (_x, top, _width, height) => {
    const target = Math.min(
      top + height + FOCUSED_INPUT_GAP - metrics.height,
      top - FOCUSED_INPUT_GAP,
    );
    if (target > metrics.offset) scrollView.scrollTo({ y: target, animated: true });
  });
}

/** Themed page: background, safe-area padding, optional scroll and footer. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  gap = 14,
  padded = true,
  avoidKeyboard = false,
  contentStyle,
  testID,
}: ScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const topInset = edges.includes('top') ? insets.top : 0;
  const bottomInset = edges.includes('bottom') ? insets.bottom : 0;

  // iOS only: Android's keyboard handling already works. Scrolls by hand rather
  // than automaticallyAdjustKeyboardInsets, whose inset would stack on the padding.
  const keepFocusVisible = avoidKeyboard && scroll && Platform.OS === 'ios';
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollMetrics = useRef<ScrollMetrics>({ height: 0, offset: 0 });

  useEffect(() => {
    if (!keepFocusVisible) return;
    // 'Did', not 'Will': by then the KeyboardAvoidingView padding is laid out.
    const subscription = Keyboard.addListener('keyboardDidShow', () =>
      revealFocusedInput(scrollRef.current, scrollMetrics.current),
    );
    return () => subscription.remove();
  }, [keepFocusVisible]);

  const contentPadding: ViewStyle = {
    gap,
    paddingTop: topInset + 12,
    paddingBottom: footer ? 16 : bottomInset + 16,
    paddingHorizontal: padded ? 20 : 0,
  };

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[contentPadding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onLayout={
        keepFocusVisible
          ? (e) => {
              scrollMetrics.current.height = e.nativeEvent.layout.height;
              // Resized with the keyboard up, e.g. a footer appeared on the first keystroke.
              if (Keyboard.isVisible()) {
                revealFocusedInput(scrollRef.current, scrollMetrics.current);
              }
            }
          : undefined
      }
      onScroll={
        keepFocusVisible
          ? (e) => {
              scrollMetrics.current.offset = e.nativeEvent.contentOffset.y;
            }
          : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentPadding, contentStyle]}>{children}</View>
  );

  const footerView = footer ? (
    <View
      testID={testID ? `${testID}-footer` : undefined}
      style={{
        maxHeight: FOOTER_MAX_HEIGHT,
        backgroundColor: theme.bg,
        borderTopWidth: 1,
        borderTopColor: theme.line,
      }}
    >
      <ScrollView
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          gap: 12,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: bottomInset > 0 ? bottomInset : 16,
        }}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical={false}
      >
        {footer}
      </ScrollView>
    </View>
  ) : null;

  const rootStyle: ViewStyle = { flex: 1, backgroundColor: theme.bg };

  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView
        testID={testID}
        style={rootStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
        {footerView}
      </KeyboardAvoidingView>
    );
  }
  return (
    <View testID={testID} style={rootStyle}>
      {body}
      {footerView}
    </View>
  );
}

export interface ScreenHeaderProps {
  title: string;
  /** Small line above the title, e.g. the date 'Thursday, October 29'. */
  eyebrow?: string;
  /** Muted line under the title. */
  subtitle?: string;
  /** 'lg' = 30pt tab-screen title (default); 'md' = 25-28pt modal question. */
  size?: 'lg' | 'md';
}

/** Page title block from the mockups (eyebrow, big title, muted subtitle). */
export function ScreenHeader({ title, eyebrow, subtitle, size = 'lg' }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const fontSize = size === 'lg' ? 30 : 26;
  return (
    <View style={{ gap: size === 'lg' ? 4 : 6 }}>
      {eyebrow ? (
        <Text style={{ color: theme.muted, fontSize: 14, fontWeight: '600' }}>{eyebrow}</Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{
          color: theme.text,
          fontSize,
          lineHeight: Math.round(fontSize * 1.18),
          fontWeight: '700',
          letterSpacing: -0.02 * fontSize,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
