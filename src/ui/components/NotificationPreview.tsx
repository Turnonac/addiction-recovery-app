import { Text, View } from 'react-native';

import { Sun } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

export interface NotificationPreviewProps {
  /** Formatted reminder time, e.g. '9:00 PM'. */
  time: string;
  /** Must match services/notifications. */
  title?: string;
  body?: string;
  /** Muted caption under the preview. Pass null to hide. */
  caption?: string | null;
}

/** Lock-screen look-alike showing exactly what the discreet daily reminder says. */
export function NotificationPreview({
  time,
  title = 'Daily reminder',
  body = 'Time to log today’s color.',
  caption = 'This is all the reminder ever says on your lock screen.',
}: NotificationPreviewProps) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <View
        accessible
        accessibilityLabel={`Reminder preview at ${time}: ${title}. ${body}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          borderRadius: 18,
          backgroundColor: theme.surface2,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.accent,
          }}
        >
          <Sun size={20} color={theme.onAccent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flexShrink: 1, color: theme.text, fontSize: 13, fontWeight: '700' }}>
              Light2Life
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '500' }}>{time}</Text>
          </View>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: theme.text, fontSize: 14 }}>{body}</Text>
        </View>
      </View>
      {caption !== null ? (
        <Text style={{ marginHorizontal: 4, color: theme.muted, fontSize: 12, lineHeight: 17 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
