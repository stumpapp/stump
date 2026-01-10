import { cn } from '@stump/components'
import { forwardRef, useMemo } from 'react'

import { usePreferences } from '@/hooks'

type SceneContainerProps = {
	unsetConstraints?: boolean
} & React.HTMLAttributes<HTMLDivElement>
const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>(
	({ className, unsetConstraints = false, ...props }, ref) => {
		const {
			preferences: { primaryNavigationMode, layoutMaxWidthPx },
		} = usePreferences()

		const preferTopBar = primaryNavigationMode === 'TOPBAR'
		const maxWidth = useMemo(() => {
			if (unsetConstraints) {
				return undefined
			}

			return preferTopBar ? layoutMaxWidthPx || undefined : undefined
		}, [preferTopBar, layoutMaxWidthPx, unsetConstraints])

		return (
			<div
				ref={ref}
				// NOTE: adding padding bottom because of the overflow-hidden on the html element and the fixed
				// topbar. This is... annoying.
				className={cn(
					'relative flex w-full flex-col p-4 pb-16 md:pb-4',
					{
						'mx-auto flex-1': preferTopBar && !unsetConstraints,
					},
					className,
				)}
				style={{
					maxWidth,
				}}
				{...props}
			/>
		)
	},
)
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
