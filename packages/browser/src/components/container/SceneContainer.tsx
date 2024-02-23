/* eslint-disable react/prop-types */
import { usePreferences } from '@/hooks'
import { cn } from '@stump/components'
import React, { forwardRef, useMemo } from 'react'

type SceneContainerProps = {
	unsetConstraints?: boolean
} & React.HTMLAttributes<HTMLDivElement>
const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>(
	({ className, unsetConstraints = false, ...props }, ref) => {
		const {
			preferences: { primary_navigation_mode, layout_max_width_px },
		} = usePreferences()

		const preferTopBar = primary_navigation_mode === 'TOPBAR'
		const maxWidth = useMemo(() => {
			if (unsetConstraints) {
				return undefined
			}

			return preferTopBar ? layout_max_width_px || undefined : undefined
		}, [preferTopBar, layout_max_width_px, unsetConstraints])

		return (
			<div
				ref={ref}
				// NOTE: adding padding bottom because of the overflow-hidden on the html element and the fixed
				// topbar. This is... annoying.
				className={cn(
					'relative flex h-full w-full flex-col p-4 pb-16 md:pb-4',
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
