import clsx from 'clsx';
import React, { ComponentProps } from 'react';

interface TrProps extends ComponentProps<'tr'> {}

export function Tr({ className, ...props }: TrProps) {
	return (
		<tr
			className={clsx(
				'odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-750',
				className,
			)}
			{...props}
		/>
	);
}

interface TdProps extends ComponentProps<'td'> {}

export function Td({ className, ...props }: TdProps) {
	return (
		<td
			className={clsx(
				'whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-800 dark:text-gray-200 sm:first:pl-6',
				className,
			)}
			{...props}
		/>
	);
}

interface ThProps extends ComponentProps<'th'> {}

export function Th({ className, ...props }: ThProps) {
	return (
		<th
			scope="col"
			className={clsx(
				'px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:first:pl-6',
				className,
			)}
			{...props}
		/>
	);
}

interface TBodyProps extends ComponentProps<'tbody'> {}

export function Tbody({ className, ...props }: TBodyProps) {
	return <tbody className={clsx('', className)} {...props} />;
}

interface THeadProps extends ComponentProps<'thead'> {}

export function THead({ className, ...props }: THeadProps) {
	return <thead className={clsx('bg-gray-50 dark:bg-gray-900', className)} {...props} />;
}

interface TableProps extends ComponentProps<'table'> {}

export default function Table({ className, ...props }: TableProps) {
	return (
		<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
			<table
				className={clsx('min-w-full divide-y divide-gray-300 dark:divide-gray-750', className)}
				{...props}
			/>
		</div>
	);
}
