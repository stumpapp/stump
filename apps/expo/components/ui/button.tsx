import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { ActivityIndicator, Pressable } from 'react-native'

import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

// TODO: Use native buttons where applicable, once expo ui stabilizes

const buttonVariants = cva('group flex items-center justify-center squircle rounded-lg', {
	variants: {
		variant: {
			brand: 'bg-fill-brand active:opacity-90',
			default: 'bg-background-surface active:opacity-90',
			destructive: 'bg-fill-danger web:hover:opacity-90 active:opacity-90',
			outline: 'border border-edge bg-background active:bg-background-surface',
			secondary: 'bg-background-inverse',
			ghost: 'active:bg-accent',
		},
		size: {
			default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3 tablet:h-14',
			sm: 'h-9 squircle rounded-lg px-3',
			md: 'h-10 squircle rounded-lg px-4',
			lg: 'h-11 squircle rounded-lg px-8 native:h-14',
			icon: 'h-10 w-10',
		},
		roundness: {
			default: 'rounded-lg',
			full: 'rounded-full',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
		roundness: 'default',
	},
})

const buttonTextVariants = cva('text-base font-medium text-foreground', {
	variants: {
		variant: {
			brand: 'text-foreground',
			default: 'text-foreground',
			destructive: 'text-white',
			outline: '',
			secondary: 'text-foreground-on-inverse',
			ghost: '',
		},
		size: {
			default: '',
			sm: '',
			md: '',
			lg: 'text-lg',
			icon: '',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
	VariantProps<typeof buttonVariants>

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
	({ className, variant, size, style, roundness, ...props }, ref) => {
		const accentColor = usePreferencesStore((state) => state.accentColor)
		const isBrand = variant === 'brand' || !variant

		return (
			<TextClassContext.Provider
				value={cn(
					props.disabled && 'web:pointer-events-none',
					buttonTextVariants({ variant, size }),
				)}
			>
				<Pressable
					className={cn(
						props.disabled && 'web:pointer-events-none opacity-50',
						buttonVariants({ variant, size, roundness, className }),
					)}
					ref={ref}
					role="button"
					{...props}
					style={{
						...(typeof style === 'object' ? style : undefined),
						...(accentColor && isBrand ? { backgroundColor: accentColor } : undefined),
					}}
				/>
			</TextClassContext.Provider>
		)
	},
)
Button.displayName = 'Button'

type RefreshButtonProps = {
	isRefreshing: boolean
} & ButtonProps

const RefreshButton = React.forwardRef<React.ElementRef<typeof Pressable>, RefreshButtonProps>(
	({ isRefreshing, children, ...props }, ref) => {
		return (
			<Button ref={ref} variant="brand" {...props}>
				{(args) => (
					<>
						{typeof children === 'function' ? children(args) : children}
						{isRefreshing && (
							<ActivityIndicator
								size="small"
								color="currentColor"
								style={{
									position: 'absolute',
									right: 10,
								}}
							/>
						)}
					</>
				)}
			</Button>
		)
	},
)
RefreshButton.displayName = 'RefreshButton'

export { Button, buttonTextVariants, buttonVariants, RefreshButton }
export type { ButtonProps }
