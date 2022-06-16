import clsx from 'clsx';
import React, { ComponentProps } from 'react';

interface SectionProps extends ComponentProps<'div'> {}

export function Section({ children, className }: SectionProps) {
	return (
		<div className={clsx('w-full', className)}>
			<section className="mx-auto">{children}</section>
		</div>
	);
}
