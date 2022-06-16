import { ComponentProps } from 'react';
import clsx from 'clsx';
import Link from 'next/link';

type ButtonOrLinkProps = ComponentProps<'button'> & ComponentProps<'a'>;

export interface Props extends ButtonOrLinkProps {
	centered?: boolean;
}

export function ButtonOrLink({ className, ...props }: Props) {
	const isLink = typeof props.href !== 'undefined';
	const isExternal = isLink && props.href!.startsWith('http');

	const Component = isLink ? 'a' : 'button';

	if (isLink && !isExternal) {
		return (
			<Link passHref href={props.href!}>
				<Component className={clsx('cursor-pointer', className)} {...props} />
			</Link>
		);
	}

	return <Component className={clsx('cursor-pointer', className)} {...props} />;
}
