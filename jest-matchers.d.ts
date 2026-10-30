// RNTL's own augmentation targets '@jest/expect' with one type parameter, but Jest 30's
// Matchers (re-exported from 'expect') has two, so whether its matchers type-check depends on
// file order. Augmenting 'expect' with the matching signature makes them always visible.
import type { JestNativeMatchers } from '@testing-library/react-native/dist/matchers/types';

declare module 'expect' {
  // Both type parameters must match the original declaration for the merge to apply.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void>, T = unknown> extends JestNativeMatchers<R> {}
}
