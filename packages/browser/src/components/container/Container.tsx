/* eslint-disable react/prop-types */

import { cn } from '@stump/components'
import React, { forwardRef } from 'react'

type Props = {
	disableHorizontalPadding?: boolean
	disableVerticalPadding?: boolean
} & React.HTMLAttributes<HTMLDivElement>

const Container = forwardRef<HTMLDivElement, Props>(
	(
		{
			className,
			disableHorizontalPadding,
			disableVerticalPadding,

			...props
		},
		ref,
	) => {
		return (
			<div
				ref={ref}
				className={cn(
					'p-4 pb-16 md:pb-4',
					{ 'p-0': disableHorizontalPadding },
					{ 'pb-0 md:pb-0': disableVerticalPadding },
					className,
				)}
				{...props}
			/>
		)
	},
)
Container.displayName = 'Container'

export default Container
