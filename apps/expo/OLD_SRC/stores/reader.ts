import AsyncStorage from '@react-native-async-storage/async-storage'
import { createReaderStore } from '@stump/client'

export const useReaderStore = createReaderStore(AsyncStorage)
