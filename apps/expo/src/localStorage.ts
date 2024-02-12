import AsyncStorage from '@react-native-async-storage/async-storage'

export class LocalStorage {
	localStore: Record<string, string> = {}
	length = 0

	getItem(key: string) {
		return this.localStore[key] ?? null
	}

	setItem(key: string, value: string) {
		this.localStore[key] = value
		this.length = Object.keys(this.localStore).length
		AsyncStorage.setItem(key, value)
	}

	removeItem(key: string) {
		delete this.localStore[key]
		this.length = Object.keys(this.localStore).length
		AsyncStorage.removeItem(key)
	}

	clear() {
		this.localStore = {}
		this.length = 0
		AsyncStorage.clear()
	}

	async load() {
		const keys = await AsyncStorage.getAllKeys()
		const items = await AsyncStorage.multiGet(keys)
		this.localStore = Object.fromEntries(items)
	}

	async sync() {
		await AsyncStorage.multiSet(Object.entries(this.localStore))
	}

	key(index: number) {
		return Object.keys(this.localStore)[index]
	}
}
