import { cva, VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon, X } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef, useCallback, useState } from 'react'

import { cn, cx } from '../utils'
import { AlertContext } from './context'

export const ALERT_ICONS = {
	error: AlertCircle,
	grayscale: Info,
	info: Info,
	success: CheckCircle,
	warning: AlertTriangle,
}

export const ALERT_VARIANTS: Record<keyof typeof ALERT_ICONS, string> = {
	error: 'bg-fill-danger-secondary text-foreground-subtle',
	grayscale: 'bg-background-surface text-foreground',
	info: 'bg-fill-info-secondary text-foreground-subtle',
	success: 'bg-fill-success-secondary text-foreground-subtle',
	warning: 'bg-fill-warning-secondary text-foreground-subtle',
}

const alertVariants = cva('p-4', {
	defaultVariants: {
		level: 'info',
		rounded: 'default',
	},
	variants: {
		level: ALERT_VARIANTS,
		rounded: {
			default: 'rounded-md',
			lg: 'rounded-lg',
			none: 'rounded-none',
			sm: 'rounded-sm',
		},
	},
})

type ClosableAlertProps = {
	closable: boolean
	id: string
}

type NonClosableAlertProps = {
	closable?: never
	id?: string
}

type ClosableAlertVariant = ClosableAlertProps | NonClosableAlertProps

export type AlertProps = {
	icon?: LucideIcon | keyof typeof ALERT_ICONS
	alignIcon?: 'center' | 'start'
} & VariantProps<typeof alertVariants> &
	ComponentPropsWithoutRef<'div'> &
	ClosableAlertVariant

const Alert = forwardRef<HTMLDivElement, AlertProps>(
	(
		{ id, className, level, rounded, icon, alignIcon = 'center', children, closable, ...props },
		ref,
	) => {
		// TODO: implement me, inspiration from https://chakra-ui.com/docs/components/alert/usage
		const [isClosed, setIsClosed] = useState(() => getIsAlertClosed(id))

		const renderIcon = () => {
			let Icon: LucideIcon | null = null

			if (typeof icon === 'string') {
				Icon = ALERT_ICONS[icon || level || 'info'] || ALERT_ICONS.info
			} else if (icon) {
				Icon = icon
			}

			if (!Icon) {
				return null
			}

			return (
				<Icon
					className={cn(
						'h-5 w-5',
						ALERT_VARIANTS[level || 'info'] || ALERT_VARIANTS.info,
						'bg-transparent dark:bg-transparent',
					)}
					aria-hidden="true"
				/>
			)
		}

		const handleCloseClick = useCallback(() => {
			if (id) {
				setAlertClosed(id)
			}
			setIsClosed(true)
		}, [id])

		if (isClosed) {
			return null
		}

		return (
			<AlertContext.Provider value={{ level: level || 'info' }}>
				<div
					ref={ref}
					{...props}
					className={cn(
						'group relative',
						alertVariants({ className, level, rounded }),
						{ 'p-[18px]': closable },
						className,
					)}
				>
					<div
						className={cx(
							'flex',
							{ 'items-start md:items-center': alignIcon === 'center' },
							{ 'items-start': alignIcon === 'start' },
						)}
					>
						<div
							className={cn('flex-shrink-0', {
								'mt-1 md:mt-0': alignIcon === 'center',
							})}
						>
							{renderIcon()}
						</div>
						{children}
					</div>

					{closable && (
						<button
							type="button"
							className="absolute right-1 top-1 hidden text-foreground-muted hover:text-foreground group-hover:block"
							onClick={handleCloseClick}
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</button>
					)}
				</div>
			</AlertContext.Provider>
		)
	},
)
Alert.displayName = 'Alert'

const AlertContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
	({ className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				{...props}
				className={cn('ml-3 flex-1 md:flex md:items-center md:justify-between', className)}
			/>
		)
	},
)
AlertContent.displayName = 'AlertContent'

const AlertTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<'h2'>>(
	({ className, ...props }, ref) => {
		return (
			<AlertContext.Consumer>
				{({ level }) => (
					<h2
						ref={ref}
						{...props}
						className={cn(
							'text-base font-medium',
							ALERT_VARIANTS[level || 'info'] || ALERT_VARIANTS.info,
							className,
						)}
					/>
				)}
			</AlertContext.Consumer>
		)
	},
)
AlertTitle.displayName = 'AlertTitle'

type AlertSubComponents = {
	Title: typeof AlertTitle
	Content: typeof AlertContent
}
const TypedAlert = Alert as typeof Alert & AlertSubComponents
TypedAlert.Title = AlertTitle
TypedAlert.Content = AlertContent

export { TypedAlert as Alert }

const getClosedAlerts = () => {
	try {
		const closedAlerts = JSON.parse(localStorage.getItem('closedStumpAlerts') || '[]')
		if (!Array.isArray(closedAlerts)) {
			return []
		}
		return closedAlerts
	} catch (error) {
		console.error(`Failed to parse closed alerts from localStorage:`, error)
		return []
	}
}

const getIsAlertClosed = (id: string | undefined) => {
	if (!id) {
		return false
	}
	const closedAlerts = getClosedAlerts()

	return closedAlerts.includes(id)
}

const setAlertClosed = (id: string) => {
	try {
		const closedAlerts = getClosedAlerts()
		if (!closedAlerts.includes(id)) {
			closedAlerts.push(id)
			localStorage.setItem('closedStumpAlerts', JSON.stringify(closedAlerts))
		}
	} catch (error) {
		console.error(`Failed to set alert as closed:`, error)
	}
}
