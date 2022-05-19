import clsx from 'clsx';
import React, { ComponentProps } from 'react';

interface ListProps extends ComponentProps<'ul'> {
	ordered?: boolean;
}

export default function List({ children, className, ordered }: ListProps) {
	return (
		<ul
			className={clsx('list list-outside ml-6', ordered ? 'list-decimal' : 'list-disc', className)}
		>
			{children}
		</ul>
	);
}
