import { registerWebModule, NativeModule } from 'expo';

import { ReadiumModuleEvents } from './Readium.types';

class ReadiumModule extends NativeModule<ReadiumModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ReadiumModule);
