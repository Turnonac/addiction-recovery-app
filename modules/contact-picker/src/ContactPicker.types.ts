/** What the Android picker returns for the chosen phone number row. */
export type PickedPhone = {
  /** Contact display name ('' if the contact has none). */
  name: string;
  /** Phone number exactly as stored in the contact ('' if empty). */
  phone: string;
};
