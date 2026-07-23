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
				'overflow-hidden rounded-xl border border-border bg-card text-card-foreground',
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
		<div className={cn('w-full first:border-t-0', renderDivider && 'border-t border-border/70')}>
			<div
				onClick={disabled ? undefined : onClick}
				className={cn(
					'gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:gap-4 flex w-full flex-col items-start justify-between',
					disabled && 'pointer-events-none opacity-50',
					onClick && !disabled && 'cursor-pointer',
					className,
				)}
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

type StatGroupProps = ComponentPropsWithoutRef<'div'>

type StatProps = {
	label: string
	value: string | number | undefined | null
	suffix?: string | number | undefined | null
}

/**
 * The StatGroup component. This acts as the container for Card.Stat items.
 */
function StatGroup({ children, className }: StatGroupProps) {
	return (
		<div
			className={cn(
				'gap-x-1 gap-y-4 p-3 flex flex-row flex-wrap items-start justify-evenly',
				className,
			)}
		>
			{children}
		</div>
	)
}

function Stat({ label, value, suffix }: StatProps) {
	return (
		<div className="flex flex-col items-center justify-center">
			<Text className="mb-1 font-medium text-center text-muted-foreground">{label}</Text>
			<div className="flex flex-row items-end">
				<Text size="xl" className="font-semibold text-center">
					{value}
				</Text>
				{suffix != null && (
					<Text size="xs" className="py-1 text-center text-muted-foreground">
						{suffix}
					</Text>
				)}
			</div>
		</div>
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
	StatGroup: typeof StatGroup
	Stat: typeof Stat
	ListLabel: typeof ListLabel
	Background: typeof CardBackground
}

export const NewCard = Object.assign(NewCardRoot, {
	Row,
	StatGroup,
	Stat,
	ListLabel,
	Background: CardBackground,
}) as NewCardComponent
