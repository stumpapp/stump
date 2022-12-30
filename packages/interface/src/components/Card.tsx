import { Box, BoxProps } from '@chakra-ui/react'
import { cva, VariantProps } from 'class-variance-authority'
import clsx from 'clsx'
import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

// FIXME: what's not to fix here lol just not a great variant pattern...
export const cardVariants = cva('relative shadow rounded-md', {
	defaultVariants: {},
	variants: {
		variant: {
			default: '',
			fixedImage: 'w-[10rem] sm:w-[10.666rem] md:w-[12rem]',
			image:
				'min-w-[10rem] min-h-[15rem] sm:min-w-[10.666rem] sm:min-h-[16rem] md:min-w-[12rem] md:min-h-[18.666rem]',
		},
	},
})
type CardBaseProps = ComponentProps<'div'> & {
	to?: string
	overlay?: React.ReactNode
	children: React.ReactNode
}
export type CardProps = VariantProps<typeof cardVariants> & CardBaseProps

// TODO: fix tab focus
export default function Card({ to, overlay, children, variant, className, ...rest }: CardProps) {
	const card = (
		<Box
			{...rest}
			bg="gray.50"
			border="1.5px solid"
			borderColor="transparent"
			_hover={
				to
					? {
							borderColor: 'brand.500',
					  }
					: undefined
			}
			_dark={{ bg: 'gray.750' }}
			className={cardVariants({
				class: clsx('relative flex flex-col overflow-hidden flex-1 space-y-1', className),
				variant,
			})}
		>
			{overlay}

			{children}
		</Box>
	)

	if (to) {
		return <Link to={to}>{card}</Link>
	}

	return card
}

interface CardBodyProps extends Omit<BoxProps, 'children'> {
	children: React.ReactNode
}

export function CardBody({ children, className, ...props }: CardBodyProps) {
	return (
		<Box px={1.5} {...props} className={clsx('flex-1', className)}>
			{children}
		</Box>
	)
}

interface CardFooterProps extends Omit<BoxProps, 'children'> {
	children: React.ReactNode
}

export function CardFooter({ children, ...props }: CardFooterProps) {
	return (
		<Box p={1.5} {...props}>
			{children}
		</Box>
	)
}

export function CardGrid({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex-1 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:gap-2 2xl:grid-cols-7 4xl:grid-cols-8 items-start justify-center md:justify-start pb-4">
			{children}
		</div>
	)
}

// function CardCornerDecoration() {
// 	return (
// 		<Box
// 			className="absolute top-0 right-0"
// 			bg="brand.500"
// 			shadow="lg"
// 			color="white"
// 			fontSize="xs"
// 			fontWeight="bold"
// 			rounded="md"
// 			py={0.5}
// 			px={1}
// 			m={1}
// 		>
// 			{children}
// 		</Box>
// 	);
// }
