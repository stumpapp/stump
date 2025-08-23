import { NavigateOptions, useNavigate as useReactRouterNavigate } from 'react-router-dom'

import { useRouterContext } from './RouterContext'

/**
 * Custom hook that provides a navigate function aware of the router base path.
 * This should be used instead of useNavigate from react-router-dom to ensure
 * proper navigation in desktop app with server prefixes
 */
export function useNavigate() {
	const navigate = useReactRouterNavigate()
	const { basePath } = useRouterContext()

	return (to: string | number, options?: NavigateOptions) => {
		if (typeof to === 'number') {
			return navigate(to)
		}

		// Don't prefix external URLs or already prefixed paths
		if (to.startsWith('http') || (basePath && to.startsWith(basePath))) {
			return navigate(to, options)
		}

		const prefixedPath = basePath ? `${basePath}${to}` : to
		return navigate(prefixedPath, options)
	}
}
