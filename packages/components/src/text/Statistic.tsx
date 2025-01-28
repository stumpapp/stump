// TODO: make me lawlz xoxo
// honestly one of the chakra components I did not hate:
// https://chakra-ui.com/docs/components/stat/usage
import { VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'
import { useCountUp } from 'use-count-up'

import { cn } from '../utils'
import { textVariants } from './Text'

type StatisticProps = ComponentPropsWithoutRef<'dl'>
const StatisticRoot = forwardRef<HTMLDListElement, StatisticProps>(
	({ className, ...props }, ref) => (
		<dl ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
	),
)
StatisticRoot.displayName = 'Statistic'

type StatisticLabelProps = VariantProps<typeof textVariants> & ComponentPropsWithoutRef<'dt'>
const StatisticLabel = forwardRef<HTMLElement, StatisticLabelProps>(
	({ className, variant, size = 'sm', ...props }, ref) => (
		<dt
			ref={ref}
			className={cn(textVariants({ className, size, variant }), className)}
			{...props}
		/>
	),
)
StatisticLabel.displayName = 'StatisticLabel'

type StatisticNumberProps = VariantProps<typeof textVariants> & ComponentPropsWithoutRef<'dd'>
const StatisticNumber = forwardRef<HTMLElement, StatisticNumberProps>(
	({ className, variant, size = 'lg', ...props }, ref) => (
		<dd
			ref={ref}
			className={cn('font-semibold', textVariants({ className, size, variant }), className)}
			{...props}
		/>
	),
)
StatisticNumber.displayName = 'StatisticNumber'

const StatisticStringValue = forwardRef<HTMLElement, StatisticNumberProps>(
	({ className, variant, size = 'lg', ...props }, ref) => (
		<dd
			ref={ref}
			className={cn('font-semibold', textVariants({ className, size, variant }), className)}
			{...props}
		/>
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
}

const Statistic = StatisticRoot as typeof StatisticRoot & StatisticSubComponents

Statistic.Label = StatisticLabel
Statistic.Number = StatisticNumber
Statistic.CountUpNumber = StatisticCountUpNumber
Statistic.StringValue = StatisticStringValue

export {
	Statistic,
	StatisticLabel,
	type StatisticLabelProps,
	StatisticNumber,
	type StatisticNumberProps,
	type StatisticProps,
}
