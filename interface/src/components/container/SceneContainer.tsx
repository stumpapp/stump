/* eslint-disable react/prop-types */
import { usePreferences } from '@stump/client'
import { cn } from '@stump/components'
import React, { forwardRef } from 'react'

const SceneContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => {
		const {
			preferences: { primary_navigation_mode, layout_max_width_px },
		} = usePreferences()

		const preferTopBar = primary_navigation_mode === 'TOPBAR'

		return (
			<div
				ref={ref}
				// NOTE: adding padding bottom because of the overflow-hidden on the html element and the fixed
				// topbar. This is... annoying.
				className={cn(
					'relative flex h-full w-full flex-col p-4 pb-16 md:pb-4',
					{
						'mx-auto flex-1': preferTopBar,
					},
					className,
				)}
				style={{
					maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
				}}
				{...props}
			/>
		)
	},
)
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
