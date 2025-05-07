import { createAppStore } from '@stump/client'

import { ZustandMMKVStorage } from './store'

export const useAppStore = createAppStore(ZustandMMKVStorage)
