import { useClientContext } from '@stump/client'

/**
 * A hook to get the Tauri RPC object from the client context. It is important to only
 * use this hook within a definitively defined Tauri context, e.g. desktop-only parts
 * of the application.
 */
export const useTauriRPC = () => {
	const ctx = useClientContext()
	if (!ctx.tauriRPC) {
		throw new Error('useTauriRPC must be used within a defined Tauri context')
	}
	return ctx.tauriRPC
}
