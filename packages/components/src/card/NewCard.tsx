import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { forwardRef } from 'react'

import { Text } from '../text'
import { cn } from '../utils'

// TODO: replace card with this one and handle renames

export type NewCardTone = 'default' | 'debug'

export type NewCardProps = {
	/**
	 * A label displayed above the card.
	 */
	label?: string
	/**
	 * An optional arbitrary node displayed across from the label.
	 */
	actions?: ReactNode
	/**
	 * A description displayed under the label.
	 */
	description?: ReactNode
	/**
	 * The palette of the card
	 */
	tone?: NewCardTone
} & ComponentPropsWithoutRef<'div'>

export type NewCardRowProps = {
	label?: ReactNode
	description?: ReactNode
	value?: ReactNode
	renderDivider?: boolean
	disabled?: boolean
} & ComponentPropsWithoutRef<'div'>

function ListLabel({ className, ...props }: ComponentPropsWithoutRef<typeof Text>) {
	return <Text className={cn('font-semibold text-muted-foreground', className)} {...props} />
}

function CardBackground({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			className={cn(
				'divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card text-card-foreground',
				className,
			)}
			{...props}
		/>
	)
}

function BaseRowComponent({
	label,
	description,
	renderDivider = true,
	children,
	className,
	onClick,
	disabled,
	...props
}: NewCardRowProps) {
	return (
		<div className="w-full">
			<div
				onClick={disabled ? undefined : onClick}
				className={cn(
					'gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:gap-4 flex w-full flex-col items-start justify-between',
					disabled && 'pointer-events-none opacity-50',
					onClick && !disabled && 'cursor-pointer',
					className,
				)}
				data-render-divider={renderDivider}
				{...props}
			>
				{label && (
					<div className="min-w-0 flex-1">
						<div className="gap-0.5 flex flex-col">
							<Text size="sm" className="leading-tight font-medium">
								{label}
							</Text>
							{description && (
								<Text size="sm" variant="muted" className="leading-tight">
									{description}
								</Text>
							)}
						</div>
					</div>
				)}
				{children}
			</div>
		</div>
	)
}

function Row({ value, children, ...props }: NewCardRowProps) {
	return (
		<BaseRowComponent {...props}>
			{value != null && <Text className="text-sm text-right text-muted-foreground">{value}</Text>}
			{children}
		</BaseRowComponent>
	)
}

const NewCardRoot = forwardRef<HTMLDivElement, NewCardProps>(
	({ label, actions, description, tone = 'default', children, className, ...props }, ref) => {
		// const count = React.Children.count(children)

		const renderHeader = () => {
			if (!label && !actions) return null

			return (
				<div
					className={cn('px-2 gap-4 flex flex-row items-center justify-between', {
						'justify-end': !label && actions,
					})}
				>
					<div className="gap-0.5 flex flex-col">
						{label && <ListLabel className="shrink-0">{label}</ListLabel>}
						{description && (
							<Text size="sm" variant="muted">
								{description}
							</Text>
						)}
					</div>
					{actions && <div>{actions}</div>}
				</div>
			)
		}

		return (
			<div ref={ref} className={cn('gap-2 flex flex-col', className)} {...props}>
				{renderHeader()}
				<CardBackground
					className={cn({
						'divide-debug/30 border-debug/40 bg-debug/10 text-foreground': tone === 'debug',
					})}
				>
					{children}
				</CardBackground>
			</div>
		)
	},
)
NewCardRoot.displayName = 'NewCard'

type NewCardComponent = typeof NewCardRoot & {
	Row: typeof Row
	ListLabel: typeof ListLabel
	Background: typeof CardBackground
}

export const NewCard = Object.assign(NewCardRoot, {
	Row,
	ListLabel,
	Background: CardBackground,
}) as NewCardComponent
