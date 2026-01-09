import { createContext, useContext } from 'react'

/**
 * Context to provide a shared portal host id for special scenarios where using the
 * root-level portal host causes issues (e.g., TrueSheet on Android).
 */
export const PortalHostContext = createContext<string | undefined>(undefined)

export function usePortalHost() {
	return useContext(PortalHostContext)
}
