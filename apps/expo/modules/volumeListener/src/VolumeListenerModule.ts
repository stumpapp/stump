import { requireNativeModule } from 'expo'

import type { NativeVolumeListenerModule } from './VolumeListener.types'

export default requireNativeModule<NativeVolumeListenerModule>('VolumeListener')
