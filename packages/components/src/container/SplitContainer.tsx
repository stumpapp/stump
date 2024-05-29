import { forwardRef } from 'react'

import { cn } from '../utils'

type Props = {
	leftHeader: string | React.ReactNode
	leftContent?: string | React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export const SplitContainer = forwardRef<HTMLDivElement, Props>(
	({ children, className, leftHeader, leftContent, ...props }, ref) => {
		const renderHeader = () => {
			if (typeof leftHeader === 'string') {
				return <h2 className="text-2xl font-semibold">{leftHeader}</h2>
			} else {
				return leftHeader
			}
		}

		const renderContent = () => {
			if (typeof leftContent === 'string') {
				return <p className="text-gray-600">{leftContent}</p>
			} else {
				return leftContent || null
			}
		}

		return (
			<div
				ref={ref}
				className={cn('grid space-y-5 md:grid-cols-12 md:space-y-0', className)}
				{...props}
			>
				<div className="flex flex-col space-y-4 md:col-span-4">
					{renderHeader()}
					{renderContent()}
				</div>
				<div className="md:col-span-7 md:col-start-6">{children}</div>
			</div>
		)
	},
)
SplitContainer.displayName = 'SplitContainer'
