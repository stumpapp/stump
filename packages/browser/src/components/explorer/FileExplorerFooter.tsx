import { ChevronRight } from 'lucide-react'
import { Fragment, useMemo } from 'react'

import { useFileExplorerContext } from './context'

export const FOOTER_HEIGHT = 40

export default function FileExplorerFooter() {
	const { currentPath, rootPath, navigateToPath } = useFileExplorerContext()

	const pathSegments = useMemo(() => {
		const rootName = rootPath.split('/').filter(Boolean).pop() ?? 'Library'

		if (!currentPath || currentPath === rootPath) {
			return [{ name: rootName, path: rootPath }]
		}

		const relativePart = currentPath.replace(rootPath, '')
		const parts = relativePart.split('/').filter(Boolean)

		return [
			{ name: rootName, path: rootPath },
			...parts.map((part, i) => ({
				name: part,
				path: rootPath + '/' + parts.slice(0, i + 1).join('/'),
			})),
		]
	}, [currentPath, rootPath])

	return (
		<footer className="bottom-0 h-10 px-4 fixed z-10 w-full border-t border-border bg-background">
			<div className="min-w-0 flex h-full items-center overflow-hidden">
				{pathSegments.map((segment, i) => {
					const isLast = i === pathSegments.length - 1
					const chevron =
						i > 0 ? (
							<ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
						) : null

					if (isLast) {
						return (
							<Fragment key={segment.path}>
								{chevron}
								<span className="max-w-56 px-1.5 py-0.5 text-xs font-medium truncate text-foreground">
									{segment.name}
								</span>
							</Fragment>
						)
					}

					return (
						<Fragment key={segment.path}>
							{chevron}
							<button
								className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								onClick={() => navigateToPath(segment.path)}
							>
								{segment.name}
							</button>
						</Fragment>
					)
				})}
			</div>
		</footer>
	)
}
