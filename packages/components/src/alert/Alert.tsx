import { cva, VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'

import { cn, cx } from '../utils'
import { AlertContext } from './context'

export const ALERT_ICONS = {
	error: AlertCircle,
	grayscale: Info,
	info: Info,
	success: CheckCircle,
	warning: AlertTriangle,
}

// TODO: adjust colors
export const ALERT_VARIANTS: Record<keyof typeof ALERT_ICONS, string> = {
	error: 'bg-red-50 text-red-700 dark:bg-red-300/25',
	grayscale: 'bg-gray-50 text-gray-700',
	info: 'bg-blue-50 text-blue-700',
	success: 'bg-green-50 text-green-700',
	warning: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-600',
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

export type AlertProps = {
	icon?: LucideIcon | keyof typeof ALERT_ICONS
	alignIcon?: 'center' | 'start'
} & VariantProps<typeof alertVariants> &
	React.ComponentPropsWithoutRef<'div'>

const Alert = forwardRef<HTMLDivElement, AlertProps>(
	({ className, level, rounded, icon, alignIcon = 'center', children, ...props }, ref) => {
		// TODO: implement me, inspriation from https://chakra-ui.com/docs/components/alert/usage

		const renderIcon = () => {
			let Icon: LucideIcon | null = null

			if (typeof icon === 'string') {
				Icon = ALERT_ICONS[level || 'info'] || ALERT_ICONS.info
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

		return (
			<AlertContext.Provider value={{ level: level || 'info' }}>
				<div
					ref={ref}
					{...props}
					className={cn(alertVariants({ className, level, rounded }), className)}
				>
					<div
						className={cx(
							'flex',
							{ 'items-center': alignIcon === 'center' },
							{ 'items-start': alignIcon === 'start' },
						)}
					>
						<div className="flex-shrink-0">{renderIcon()}</div>
						{children}
					</div>
				</div>
			</AlertContext.Provider>
		)
	},
)
Alert.displayName = 'Alert'

const AlertContent = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
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

const AlertTitle = forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<'h2'>>(
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
