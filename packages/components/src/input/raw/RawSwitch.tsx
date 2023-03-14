import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../../utils'

export const SWITCH_BASE_CLASSES =
	'inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900 data-[state=unchecked]:bg-gray-200'

export const SWITCH_SIZE_VARIANTS = {
	default: 'h-[24px] w-[44px]',
	sm: 'h-[20px] w-[36px]',
	xs: 'h-[16px] w-[28px]',
}
export const SWITCH_VARIANTS = {
	default:
		'focus:ring-gray-400 dark:focus:ring-gray-400 data-[state=checked]:bg-gray-900 dark:data-[state=unchecked]:bg-gray-700 dark:data-[state=checked]:bg-gray-400',
	primary:
		'focus:ring-brand-400 dark:focus:ring-brand-400 data-[state=checked]:bg-brand-400 dark:data-[state=unchecked]:bg-gray-800 dark:data-[state=checked]:bg-brand-400 dark:border-gray-750',
}
export const switchVariants = cva(SWITCH_BASE_CLASSES, {
	defaultVariants: {
		size: 'default',
		variant: 'default',
	},
	variants: {
		size: SWITCH_SIZE_VARIANTS,
		variant: SWITCH_VARIANTS,
	},
})

export type RawSwitchRef = React.ElementRef<typeof SwitchPrimitives.Root>
// TODO: figure out icon(s)
// type SwitchIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element
export type RawSwitchProps = VariantProps<typeof switchVariants> &
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
// & {
// 	CheckedIcon?: SwitchIcon
// 	UnCheckedIcon?: SwitchIcon
// }

export const RawSwitch = React.forwardRef<RawSwitchRef, RawSwitchProps>(
	({ className, variant, size, ...props }, ref) => {
		// const renderIcon = () => {
		// 	if (!CheckedIcon && !UnCheckedIcon) return null

		// 	const color = cn({ '': variant === 'default' }, { '': variant === 'primary' })

		// 	return (
		// 		<>
		// 			{CheckedIcon && <CheckedIcon className={cn('data-[state=unchecked]:hidden')} />}
		// 			{UnCheckedIcon && <UnCheckedIcon className={cn('data-[state=checked]:hidden')} />}
		// 		</>
		// 	)
		// }
		return (
			<SwitchPrimitives.Root
				className={cn(switchVariants({ className, size, variant }))}
				{...props}
				ref={ref}
			>
				<SwitchPrimitives.Thumb
					className={cn(
						'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5',
					)}
				/>
			</SwitchPrimitives.Root>
		)
	},
)
RawSwitch.displayName = SwitchPrimitives.Root.displayName
