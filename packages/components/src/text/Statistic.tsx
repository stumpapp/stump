import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { forwardRef } from 'react'
import { useCountUp } from 'use-count-up'

import { cn } from '../utils'
import { textVariants } from './Text'

const statisticVariants = cva('flex flex-col', {
	defaultVariants: {
		size: 'md',
	},
	variants: {
		size: {
			xs: 'gap-0',
			sm: 'gap-0.5',
			md: 'gap-1',
			lg: 'gap-1.5',
		},
	},
})

const VALUE_SIZE_MAP = {
	xs: 'xs',
	sm: 'sm',
	md: 'lg',
	lg: 'xl',
} as const

type StatisticSize = 'xs' | 'sm' | 'md' | 'lg'

type StatisticProps = ComponentPropsWithoutRef<'dl'> & VariantProps<typeof statisticVariants>
const StatisticRoot = forwardRef<HTMLDListElement, StatisticProps>(
	({ className, size, ...props }, ref) => (
		<dl ref={ref} className={cn(statisticVariants({ size }), className)} {...props} />
	),
)
StatisticRoot.displayName = 'Statistic'

type StatisticLabelProps = VariantProps<typeof textVariants> & ComponentPropsWithoutRef<'dt'>
const StatisticLabel = forwardRef<HTMLElement, StatisticLabelProps>(
	({ className, variant = 'muted', size = 'sm', ...props }, ref) => (
		<dt ref={ref} className={cn(textVariants({ size, variant }), className)} {...props} />
	),
)
StatisticLabel.displayName = 'StatisticLabel'

type StatisticNumberProps = VariantProps<typeof textVariants> & ComponentPropsWithoutRef<'dd'>
const StatisticNumber = forwardRef<HTMLElement, StatisticNumberProps>(
	({ className, variant, size = 'lg', ...props }, ref) => (
		<dd
			ref={ref}
			className={cn('font-semibold', textVariants({ size, variant }), className)}
			{...props}
		/>
	),
)
StatisticNumber.displayName = 'StatisticNumber'

type StatisticStringValueProps = VariantProps<typeof textVariants> &
	ComponentPropsWithoutRef<'dd'> & {
		suffix?: ReactNode
	}
const StatisticStringValue = forwardRef<HTMLElement, StatisticStringValueProps>(
	({ className, variant, size = 'lg', suffix, children, ...props }, ref) => (
		<dd
			ref={ref}
			className={cn('font-semibold', textVariants({ size, variant }), className)}
			{...props}
		>
			{children}
			{suffix != null && (
				<span className={cn('font-normal', textVariants({ size: 'xs', variant: 'muted' }))}>
					{' '}
					{suffix}
				</span>
			)}
		</dd>
	),
)
StatisticStringValue.displayName = 'StatisticStringValue'

type StatisticCountUpNumberProps = Omit<StatisticNumberProps, 'children'> & {
	value: number
	duration?: number
	decimal?: boolean
	enabled?: boolean
	unit?: string
}
const StatisticCountUpNumber = forwardRef<HTMLElement, StatisticCountUpNumberProps>(
	({ value, duration = 1.5, decimal = false, enabled = true, unit, ...props }, ref) => {
		const { value: currentValue } = useCountUp({
			duration,
			// FIXME: not safe!?
			end: Number(value),
			formatter: (value) => {
				if (decimal) {
					// TODO: do locale conversion too?
					return value.toFixed(2)
				}
				return Math.round(value).toLocaleString()
			},
			isCounting: enabled,
		})

		return (
			<StatisticNumber ref={ref} {...props}>
				{currentValue} {unit}
			</StatisticNumber>
		)
	},
)
StatisticCountUpNumber.displayName = 'StatisticCountUpNumber'

type StatisticSubComponents = {
	Label: typeof StatisticLabel
	Number: typeof StatisticNumber
	CountUpNumber: typeof StatisticCountUpNumber
	StringValue: typeof StatisticStringValue
	Item: typeof StatisticItem
}

type StatisticItemProps = {
	label: string
	value: string | number
	suffix?: ReactNode
	size?: StatisticSize
	className?: string
}

function StatisticItem({ label, value, suffix, size = 'sm', className }: StatisticItemProps) {
	return (
		<StatisticRoot size={size} className={className}>
			<StatisticLabel size={size} variant="muted">
				{label}
			</StatisticLabel>
			<StatisticStringValue size={size} suffix={suffix}>
				{value}
			</StatisticStringValue>
		</StatisticRoot>
	)
}
StatisticItem.displayName = 'StatisticItem'

const Statistic = StatisticRoot as typeof StatisticRoot & StatisticSubComponents

Statistic.Label = StatisticLabel
Statistic.Number = StatisticNumber
Statistic.CountUpNumber = StatisticCountUpNumber
Statistic.StringValue = StatisticStringValue
Statistic.Item = StatisticItem

export {
	Statistic,
	StatisticItem,
	type StatisticItemProps,
	StatisticLabel,
	type StatisticLabelProps,
	StatisticNumber,
	type StatisticNumberProps,
	type StatisticProps,
	type StatisticSize,
	StatisticStringValue,
	type StatisticStringValueProps,
	VALUE_SIZE_MAP,
}
