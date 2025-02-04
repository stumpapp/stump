import { NativeModule, requireNativeModule } from 'expo';

import { ReadiumModuleEvents } from './Readium.types';

declare class ReadiumModule extends NativeModule<ReadiumModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ReadiumModule>('Readium');
