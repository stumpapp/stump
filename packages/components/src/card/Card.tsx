/* eslint-disable react/prop-types */
// Card
// CardContent
// CardOverlay

import React from 'react'

import { cn } from '../utils'

// TODO: div OR link
type CardBaseProps = React.ComponentPropsWithoutRef<'div'>
export type CardProps = /*VariantProps<typeof cardVariants> &*/ CardBaseProps
export const Card = React.forwardRef<React.ElementRef<'div'>, CardProps>(
	({ className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					'border-[1.5px_solid] border-transparent bg-gray-50 dark:bg-gray-750',
					className,
				)}
				{...props}
			/>
		)

		// 	return <Box
		//   {...rest}
		//   bg="gray.50"
		//   border="1.5px solid"
		//   borderColor="transparent"
		//   _hover={
		//     to
		//       ? {
		//           borderColor: 'brand.500',
		//         }
		//       : undefined
		//   }
		//   _dark={{ bg: 'gray.750' }}
		//   className={cardVariants({
		//     class: clsx('relative flex flex-col overflow-hidden flex-1 space-y-1', className),
		//     variant,
		//   })}
		// >
		//   {overlay}
		//   {children}
		// </Box>
	},
)
Card.displayName = 'Card'
