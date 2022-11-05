import { Box, BoxProps } from '@chakra-ui/react';
import { cva, VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { ComponentProps } from 'react';
import { Link } from 'react-router-dom';

export const cardVariants = cva('relative shadow rounded-md', {
	variants: {
		variant: {
			default: '',
			image: 'min-w-[10rem] sm:min-w-[10.666rem] md:min-w-[12rem]',
		},
		size: {
			sm: '',
			md: '',
			lg: '',
		},
	},
	defaultVariants: {
		size: 'md',
	},
});
type CardBaseProps = ComponentProps<'div'> & {
	to?: string;
	overlay?: React.ReactNode;
	children: React.ReactNode;
};
export type CardProps = VariantProps<typeof cardVariants> & CardBaseProps;

export default function Card({
	to,
	overlay,
	children,
	size,
	variant,
	className,
	...rest
}: CardProps) {
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
			// maxW={{ base: '16rem', sm: '28rem', md: '24rem', lg: '28rem' }}
			// minW="10.666rem"
			className={cardVariants({
				variant,
				size,
				class: clsx('relative flex flex-col overflow-hidden flex-1 space-y-1', className),
			})}
		>
			{overlay}

			{children}
		</Box>
	);

	if (to) {
		return <Link to={to}>{card}</Link>;
	}

	return card;
}

interface CardBodyProps extends Omit<BoxProps, 'children'> {
	children: React.ReactNode;
}

export function CardBody({ children, className, ...props }: CardBodyProps) {
	return (
		<Box px={1.5} {...props} className={clsx('flex-1', className)}>
			{children}
		</Box>
	);
}

interface CardFooterProps extends Omit<BoxProps, 'children'> {
	children: React.ReactNode;
}

export function CardFooter({ children, ...props }: CardFooterProps) {
	return (
		<Box p={1.5} {...props}>
			{children}
		</Box>
	);
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
