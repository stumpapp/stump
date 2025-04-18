import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAppStore } from '@stump/client'

export const useAppStore = createAppStore(AsyncStorage)
