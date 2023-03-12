/* eslint-disable react/prop-types */
import * as SwitchPrimitives from '@radix-ui/react-switch'
import React from 'react'

import { cn } from '../../utils'

export type RawSwitchRef = React.ElementRef<typeof SwitchPrimitives.Root>
export type RawSwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
export const RawSwitch = React.forwardRef<RawSwitchRef, RawSwitchProps>(
	({ className, ...props }, ref) => (
		<SwitchPrimitives.Root
			className={cn(
				'peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-gray-200 data-[state=checked]:bg-gray-900 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900 dark:data-[state=unchecked]:bg-gray-700 dark:data-[state=checked]:bg-gray-400',
				className,
			)}
			{...props}
			ref={ref}
		>
			<SwitchPrimitives.Thumb
				className={cn(
					'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5',
				)}
			/>
		</SwitchPrimitives.Root>
	),
)
RawSwitch.displayName = SwitchPrimitives.Root.displayName
