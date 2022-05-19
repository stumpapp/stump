import React from 'react';
import { cva } from 'class-variance-authority';
import clsx from 'clsx';

import { ButtonOrLink, Props as ButtonOrLinkProps } from './ButtonOrLink';

import type { VariantProps } from 'class-variance-authority';
import { BUTTON_BASE, BUTTON_VARIANTS } from './Button';

export const buttonVariants = cva(BUTTON_BASE, {
	variants: {
		variant: BUTTON_VARIANTS,
		size: {
			xs: 'p-1 text-sm font-medium',
			sm: 'p-1.5 text-base font-medium',
			md: 'p-3 text-lg font-medium',
		},
	},
	defaultVariants: {
		variant: 'ghost',
		size: 'sm',
	},
});

export type ButtonProps = VariantProps<typeof buttonVariants> & ButtonOrLinkProps;

export default function IconButton({ variant, size, className, ...props }: ButtonProps) {
	const { centered, ...rest } = props;
	return (
		<ButtonOrLink
			className={buttonVariants({
				variant,
				size,
				class: clsx(className, { 'justify-center': centered }),
			})}
			{...rest}
		/>
	);
}
