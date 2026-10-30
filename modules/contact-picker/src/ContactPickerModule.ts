import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { PickedPhone } from './ContactPicker.types';

declare class ContactPickerModule extends NativeModule {
  /**
   * Opens the system contact picker filtered to phone numbers (Intent.ACTION_PICK on
   * Phone.CONTENT_URI). Needs no READ_CONTACTS permission: the picker grants temporary
   * read access to the chosen row. Resolves null if the user backs out.
   */
  pickPhone(): Promise<PickedPhone | null>;
}

/**
 * Android only. Null on iOS, web, and in Expo Go (no custom native code), so callers
 * must fall back to typing the number.
 */
export default requireOptionalNativeModule<ContactPickerModule>('ContactPicker');
