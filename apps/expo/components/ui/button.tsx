import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Pressable } from 'react-native'

import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

// TODO: rewrite this template

const buttonVariants = cva('group flex items-center justify-center rounded-lg', {
	variants: {
		variant: {
			brand: 'bg-fill-brand active:opacity-90',
			default: 'bg-background-surface active:opacity-90',
			destructive: 'bg-destructive web:hover:opacity-90 active:opacity-90',
			outline: 'border border-edge bg-background active:bg-background-surface',
			secondary: 'bg-background-inverse',
			ghost: 'active:bg-accent',
			link: 'web:underline-offset-4 web:hover:underline web:focus:underline ',
		},
		size: {
			default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3',
			sm: 'h-9 rounded-lg px-3',
			lg: 'h-11 rounded-lg px-8 native:h-14',
			icon: 'h-10 w-10',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

const buttonTextVariants = cva('text-base font-medium text-foreground', {
	variants: {
		variant: {
			brand: 'text-foreground',
			default: 'text-foreground',
			destructive: 'text-fill-danger',
			outline: 'group-active:text-fill-info',
			secondary: 'text-secondary-foreground group-active:text-secondary-foreground',
			ghost: 'group-active:text-fill-info',
			link: 'text-primary group-active:underline',
		},
		size: {
			default: '',
			sm: '',
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
	({ className, variant, size, ...props }, ref) => {
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
						buttonVariants({ variant, size, className }),
					)}
					ref={ref}
					role="button"
					{...props}
				/>
			</TextClassContext.Provider>
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
