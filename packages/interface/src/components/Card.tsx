import { cn } from '@stump/components'
import { cva, VariantProps } from 'class-variance-authority'
import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

// FIXME: rewrite this terrible component lol

export const cardVariants = cva(
	'relative flex flex-1 flex-col space-y-1 overflow-hidden shadow rounded-md bg-gray-50/50 border-[1.5px] border-transparent dark:bg-gray-950',
	{
		defaultVariants: {},
		variants: {
			variant: {
				default: '',
				fixedImage: 'w-[10rem] sm:w-[10.666rem] md:w-[12rem]',
				image:
					'min-w-[10rem] min-h-[15rem] sm:min-w-[10.666rem] sm:min-h-[16rem] md:min-w-[12rem] md:min-h-[18.666rem]',
			},
		},
	},
)
type CardBaseProps = ComponentProps<'div'> & {
	to?: string
	overlay?: React.ReactNode
	children: React.ReactNode
}
export type CardProps = VariantProps<typeof cardVariants> & CardBaseProps

// TODO: fix tab focus
export default function EntityCard({
	to,
	overlay,
	children,
	variant,
	className,
	...rest
}: CardProps) {
	const card = (
		<div
			{...rest}
			className={cn(
				{ 'hover:border-brand': !!to },
				cardVariants({
					variant,
				}),
				className,
			)}
		>
			{overlay}

			{children}
		</div>
	)

	if (to) {
		return <Link to={to}>{card}</Link>
	}

	return card
}

interface CardBodyProps extends Omit<ComponentProps<'div'>, 'children'> {
	children: React.ReactNode
}

export function CardBody({ children, className, ...props }: CardBodyProps) {
	return (
		<div {...props} className={cn('flex-1 px-1.5', className)}>
			{children}
		</div>
	)
}

interface CardFooterProps extends Omit<ComponentProps<'div'>, 'children'> {
	children: React.ReactNode
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
	return (
		<div {...props} className={cn('px-1.5', className)}>
			{children}
		</div>
	)
}

export function CardGrid({ children }: { children: React.ReactNode }) {
	return (
		<div className="4xl:grid-cols-8 grid flex-1 grid-cols-2 items-start justify-center gap-4 pb-4 sm:grid-cols-3 md:justify-start lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:grid-cols-7 2xl:gap-2">
			{children}
		</div>
	)
}
