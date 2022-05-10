import React from 'react';
import { cva } from 'class-variance-authority';
import clsx from 'clsx';

import { ButtonOrLink, Props as ButtonOrLinkProps } from './ButtonOrLink';

import type { VariantProps } from 'class-variance-authority';

const baseStyle =
	'border rounded-md items-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-white dark:focus:ring-offset-black dark:bg-opacity-90 dark:hover:bg-opacity-100 dark:active:opacity-90';

export const buttonVariants = cva(baseStyle, {
	variants: {
		intent: {
			ghost:
				'bg-gray-50 shadow-sm hover:bg-gray-100 active:bg-gray-50 dark:bg-transparent dark:active:bg-gray-600 dark:hover:bg-gray-650 border-gray-100 hover:border-gray-200 active:border-gray-200 dark:border-transparent dark:active:border-gray-600 dark:hover:border-gray-500 text-gray-700 hover:text-gray-900 active:text-gray-600 dark:text-gray-200  dark:active:text-white dark:hover:text-white',
			primary:
				'bg-gray-100 shadow-sm hover:bg-gray-200 active:bg-gray-100 dark:bg-gray-500 dark:hover:bg-gray-500 dark:active:bg-gray-550 border-gray-200 hover:border-gray-300 active:border-gray-200 dark:border-gray-500 dark:active:border-gray-600 dark:hover:border-gray-500 text-gray-700hover:text-gray-900 active:text-gray-600 dark:text-gray-200  dark:active:text-white dark:hover:text-white',
			brand:
				'bg-brand-600 hover:bg-brand-500 text-white border-brand-500 hover:border-brand-500 dark:active:bg-brand-600 active:border-brand-700',
			danger:
				'bg-red-600 text-white focus:ring-red-500 border-red-500 hover:border-red-500 dark:active:bg-red-600 active:border-red-700',

			gradient:
				'bg-gradient-to-r from-brand-500 to-brand-400 hover:from-brand-600 hover:to-brand-500 text-gray-50',
		},
		size: {
			sm: 'py-1 px-2 text-sm font-medium',
			md: 'px-4 py-2 text-md font-medium',
		},
	},
	defaultVariants: {
		intent: 'ghost',
		size: 'md',
	},
});

export type ButtonProps = VariantProps<typeof buttonVariants> & ButtonOrLinkProps;

export default function Button({ intent, size, className, ...props }: ButtonProps) {
	const { centered, ...rest } = props;
	return (
		<ButtonOrLink
			className={buttonVariants({
				intent,
				size,
				class: clsx(className, { 'justify-center': centered }),
			})}
			{...rest}
		/>
	);
}
