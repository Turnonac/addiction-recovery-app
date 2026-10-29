import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, Linking, Text, View } from 'react-native';

import { BackButton, Card, Screen, ScreenHeader, SettingsGroup, SettingsRow } from '@/ui/components';
import { Check } from '@/ui/icons';
import { useAppTheme } from '@/ui/theme';

/** Set once the privacy policy is published; the row stays hidden while empty. */
const PRIVACY_POLICY_URL: string = '';

const PRIVACY_POINTS = [
  'No account and no sign-up.',
  'No servers. Everything you enter stays on this phone.',
  'No ads, no analytics, no tracking.',
  "Your data leaves this phone only if you export a backup file, or through your phone's own iCloud or Google backup.",
  'The app never contacts your partner. You make the call.',
] as const;

const DISCLAIMER =
  'WalkInLight is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.';

/** Settings › About: mission, privacy statement, disclaimer, version. */
export default function AboutScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const openPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL).catch(() =>
      Alert.alert("Couldn't open the link", PRIVACY_POLICY_URL),
    );
  };

  const body = { color: theme.text, fontSize: 15, lineHeight: 22 } as const;
  const heading = { color: theme.text, fontSize: 17, fontWeight: '700' } as const;

  return (
    <Screen gap={16}>
      <BackButton label="Settings" onPress={goBack} />
      <ScreenHeader title="About" />

      <Card gap={8}>
        <Text accessibilityRole="header" style={heading}>
          Why WalkInLight
        </Text>
        <Text style={body}>
          WalkInLight is a small daily habit for recovery. Each day you name your lowest color, call
          one person you trust, and they pray for you. Honest, simple, one day at a time.
        </Text>
      </Card>

      <Card gap={10}>
        <Text accessibilityRole="header" style={heading}>
          Your privacy
        </Text>
        {PRIVACY_POINTS.map((point) => (
          <View key={point} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 2 }}>
              <Check size={18} color={theme.accentText} strokeWidth={2.6} />
            </View>
            <Text style={[body, { flex: 1, fontSize: 14, lineHeight: 20 }]}>{point}</Text>
          </View>
        ))}
      </Card>

      <Card gap={8}>
        <Text accessibilityRole="header" style={heading}>
          Not medical advice
        </Text>
        <Text style={[body, { fontSize: 14, lineHeight: 20 }]}>{DISCLAIMER}</Text>
      </Card>

      <SettingsGroup>
        <SettingsRow title="Version" value={version} />
        {PRIVACY_POLICY_URL !== '' ? (
          <SettingsRow title="Privacy policy" onPress={openPolicy} accessibilityHint="Opens in your browser" />
        ) : null}
      </SettingsGroup>
    </Screen>
  );
}
