import { ComponentProps } from 'react';

type ButtonOrLinkProps = ComponentProps<'button'> & ComponentProps<'a'>;

export interface Props extends ButtonOrLinkProps {
	centered?: boolean;
}

export function ButtonOrLink(props: Props) {
	const isLink = typeof props.href !== 'undefined';
	const Component = isLink ? 'a' : 'button';

	return <Component {...props} />;
}
