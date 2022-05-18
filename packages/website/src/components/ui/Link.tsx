import clsx from 'clsx';
import { ArrowSquareOut } from 'phosphor-react';
import React, { ComponentProps } from 'react';
import NextLink from 'next/link';

export interface LinkProps extends ComponentProps<typeof NextLink> {
	isExternal?: boolean;
	noUnderline?: boolean;
}

export default function Link({ isExternal, noUnderline, ...props }: LinkProps) {
	const { children, className, title, ...rest } = props;
	return (
		<NextLink
			passHref
			title={title ?? props.href?.toString()}
			target={isExternal ? '__blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			{...rest}
		>
			<a
				className={clsx(className, { 'hover:underline': !noUnderline }, 'inline-flex items-center')}
			>
				<span>{children}</span>

				{isExternal && <ArrowSquareOut className="ml-1" />}
			</a>
		</NextLink>
	);
}
