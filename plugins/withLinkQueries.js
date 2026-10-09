// Lets Linking.canOpenURL/openURL see dialer and SMS apps on Android 11+
// (package visibility), used by the crisis "Call" / "Text" buttons in Settings.
const { withAndroidManifest } = require('expo/config-plugins');

const QUERIES = [
  { action: 'android.intent.action.DIAL', scheme: 'tel' },
  { action: 'android.intent.action.SENDTO', scheme: 'smsto' },
  { action: 'android.intent.action.SENDTO', scheme: 'sms' },
  { action: 'android.intent.action.VIEW', scheme: 'https' },
];

module.exports = function withLinkQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const q = manifest.queries[0];
    q.intent = q.intent ?? [];
    for (const { action, scheme } of QUERIES) {
      const exists = q.intent.some(
        (i) => i.action?.[0]?.$?.['android:name'] === action && i.data?.[0]?.$?.['android:scheme'] === scheme,
      );
      if (!exists) {
        q.intent.push({ action: [{ $: { 'android:name': action } }], data: [{ $: { 'android:scheme': scheme } }] });
      }
    }
    return cfg;
  });
};
