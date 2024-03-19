import { createJSONStorage } from 'zustand/middleware'

const globalLocalStorage = typeof window !== 'undefined' ? window.localStorage : null

/**
 * This function is used to get the default storage for zustand stores which require
 * persistence.
 *
 * It is a work around for the fact that this package is used in both
 * React web and React Native apps, and the `storage` field *must* be provided to avoid
 * a yucky error. For more information on that, see https://github.com/pmndrs/zustand/discussions/1795
 */
export const getDefaultStorage = () =>
	globalLocalStorage
		? { storage: createJSONStorage(() => globalLocalStorage) }
		: {
				storage: createJSONStorage(() => ({
					getItem: () => Promise.resolve(null),
					removeItem: () => Promise.resolve(),
					setItem: () => Promise.resolve(),
				})),
			}
