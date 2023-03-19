import { cva, VariantProps } from 'class-variance-authority'
import { AlertCircle, AlertTriangle, CheckCircle, Info, LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'

import { cn, cx } from '../utils'

export const ALERT_ICONS = {
	error: AlertCircle,
	grayscale: Info,
	info: Info,
	success: CheckCircle,
	warning: AlertTriangle,
}

// TODO: adjust colors
export const ALERT_VARIANTS: Record<keyof typeof ALERT_ICONS, string> = {
	error: 'bg-red-50 text-red-700',
	grayscale: 'bg-gray-50 text-gray-700',
	info: 'bg-blue-50 text-blue-700',
	success: 'bg-green-50 text-green-700',
	warning: 'bg-yellow-50 text-yellow-700',
}

const alertVariants = cva('p-4', {
	defaultVariants: {
		level: 'info',
	},
	variants: {
		level: ALERT_VARIANTS,
	},
})

export type AlertProps = {
	icon?: LucideIcon
} & VariantProps<typeof alertVariants> &
	React.ComponentPropsWithoutRef<'div'>

// TODO: this just needs to be separated into things like Alert.Header, Alert.Content, etc. So that the text can be styled differently.
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
	({ className, level, icon, children, ...props }, ref) => {
		// TODO: implement me, inspriation from https://chakra-ui.com/docs/components/alert/usage

		const renderIcon = () => {
			let Icon: LucideIcon

			if (icon) {
				Icon = icon
			} else {
				Icon = ALERT_ICONS[level || 'info'] || ALERT_ICONS.info
			}

			return (
				<Icon
					className={cx('h-5 w-5', ALERT_VARIANTS[level || 'info'] || ALERT_VARIANTS.info)}
					aria-hidden="true"
				/>
			)
		}

		return (
			<div ref={ref} {...props} className={cn(alertVariants({ className, level }), className)}>
				<div className="flex">
					<div className="flex-shrink-0">{renderIcon()}</div>
					<div className="ml-3 flex-1 md:flex md:justify-between">{children}</div>
				</div>
			</div>
		)
	},
)
Alert.displayName = 'Alert'
