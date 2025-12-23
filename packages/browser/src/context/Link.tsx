import { forwardRef } from 'react'
import { Link as ReactRouterLink, LinkProps as ReactRouterLinkProps } from 'react-router-dom'

import { useRouterContext } from './RouterContext'

type LinkProps = ReactRouterLinkProps

/**
 * Custom Link component that's aware of the router base path.
 * This should be used instead of Link from react-router-dom to ensure
 * proper navigation in desktop app with server prefixes.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
	const { basePath } = useRouterContext()

	// Don't prefix external URLs or already prefixed paths
	if (typeof to === 'string' && (to.startsWith('http') || (basePath && to.startsWith(basePath)))) {
		return <ReactRouterLink ref={ref} to={to} {...props} />
	}

	const prefixedTo = basePath && typeof to === 'string' ? `${basePath}${to}` : to

	return <ReactRouterLink ref={ref} to={prefixedTo} {...props} />
})
