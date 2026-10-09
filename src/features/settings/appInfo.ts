import Constants from 'expo-constants';

/** App version from app.json (expo-constants), e.g. "1.0.0". */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
