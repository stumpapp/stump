import React from 'react';
import { cva } from 'class-variance-authority';
import clsx from 'clsx';

import { ButtonOrLink, Props as ButtonOrLinkProps } from './ButtonOrLink';

import type { VariantProps } from 'class-variance-authority';

export const BUTTON_BASE =
	'border rounded-md items-center transition-all duration-300 focus:outline-none dark:bg-opacity-90 dark:hover:bg-opacity-100 dark:active:opacity-90';

export const BUTTON_VARIANTS = {
	ghost:
		'bg-transparent border-transparent hover:border-gray-200 active:border-gray-200 dark:active:border-gray-650 dark:hover:border-gray-550 dark:shadow-sm hover:bg-gray-50 active:bg-gray-50 dark:hover:bg-gray-700 dark:active:bg-gray-650 text-gray-700 hover:text-gray-900 active:text-gray-600 dark:text-gray-200 dark:active:text-white dark:hover:text-white',
	primary:
		'bg-gray-650 dark:bg-gray-700 dark:hover:bg-gray-650 border-gray-500 dark:border-gray-550 hover:border-gray-450 active:border-gray-450 dark:active:border-gray-450 dark:hover:border-gray-450 dark:shadow-sm hover:bg-gray-600 active:bg-gray-50 dark:hover:bg-gray-700 dark:active:bg-gray-650 text-gray-50 hover:text-white active:text-white dark:text-gray-200 dark:active:text-white dark:hover:text-white',
	brand:
		'bg-brand hover:bg-brand-600 text-white border-brand-500 hover:border-brand-500 dark:active:bg-brand-600 active:border-brand-700',
	danger:
		'bg-red-600 text-white focus:ring-red-500 border-red-500 hover:border-red-500 dark:active:bg-red-600 active:border-red-700',
};

export const buttonVariants = cva(BUTTON_BASE, {
	variants: {
		variant: BUTTON_VARIANTS,
		size: {
			xs: 'py-0.5 px-[0.35rem] text-xs font-medium',
			sm: 'py-1 px-2 text-sm font-medium',
			md: 'py-1.5 px-3 text-sm font-medium',
			lg: 'py-1.5 px-4 text-base font-medium',
		},
	},
	defaultVariants: {
		variant: 'ghost',
		size: 'md',
	},
});

export type ButtonProps = VariantProps<typeof buttonVariants> & ButtonOrLinkProps;

export default function Button({ variant, size, className, ...props }: ButtonProps) {
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
