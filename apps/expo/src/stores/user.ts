import AsyncStorage from '@react-native-async-storage/async-storage'
import { createUserStore } from '@stump/client'

export const useUserStore = createUserStore(AsyncStorage)
