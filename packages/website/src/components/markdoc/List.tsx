import clsx from 'clsx';
import React, { ComponentProps } from 'react';

interface ListProps extends ComponentProps<'ul'> {}

export default function List({ children, className }: ListProps) {
	return <ul className={clsx('list list-disc list-outside ml-6', className)}>{children}</ul>;
}
