import clsx from 'clsx';
import { ArrowSquareOut } from 'phosphor-react';
import React from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

export interface LinkProps extends RouterLinkProps {
	isExternal?: boolean;
	noUnderline?: boolean;
}

export default function Link({ isExternal, noUnderline, ...props }: LinkProps) {
	const { children, className, title, ...rest } = props;
	return (
		<RouterLink
			title={title ?? props.to.toString()}
			className={clsx(className, { 'hover:underline': !noUnderline }, 'inline-flex items-center')}
			target={isExternal ? '__blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			{...rest}
		>
			<span>{children}</span>

			{isExternal && <ArrowSquareOut className="ml-1" />}
		</RouterLink>
	);
}
