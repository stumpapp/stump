import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

const alertVariants = cva(
	'relative w-full rounded-lg border border-edge px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
	{
		variants: {
			variant: {
				default: 'bg-background-surface text-foreground',
				info: 'bg-fill-info-secondary text-foreground-subtle border-fill-info/10',
				success: 'bg-fill-success-secondary text-foreground-subtle border-fill-success/10',
				warning: 'bg-fill-warning-secondary text-foreground-subtle border-fill-warning/10',
				destructive:
					'bg-fill-danger-secondary text-foreground-danger [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

type DismissableProps = {
	id: string
	dismissible: true
}

type NormalProps = {
	id?: never
	dismissible?: false
}

type Props = (DismissableProps | NormalProps) & VariantProps<typeof alertVariants>

function Alert({
	className,
	variant,
	dismissible,
	id,
	children,
	...props
}: React.ComponentProps<'div'> & Props) {
	const [isVisible, setIsVisible] = React.useState(() => {
		if (!dismissible) return true
		const storedValue = localStorage.getItem(`stump-alert-dismissed-${id}`)
		return !storedValue || storedValue === 'true'
	})

	const onDismiss = () => {
		setIsVisible(false)
		localStorage.setItem(`stump-alert-dismissed-${id}`, 'true')
	}

	if (!isVisible) return null

	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(
				alertVariants({ variant }),
				{
					'group relative transition-opacity duration-200': dismissible,
				},
				className,
			)}
			{...props}
		>
			{children}

			{dismissible && (
				<button
					aria-label="Dismiss this alert"
					className="absolute right-2 top-2 opacity-50 outline-none hover:opacity-100 group-hover:opacity-80"
					onClick={onDismiss}
				>
					<X className="size-4" />
				</button>
			)}
		</div>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-title"
			className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
			{...props}
		/>
	)
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-description"
			className={cn(
				'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
				className,
			)}
			{...props}
		/>
	)
}

export { Alert, AlertDescription, AlertTitle }
