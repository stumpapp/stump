import clsx from 'clsx';
import { ArrowSquareOut } from 'phosphor-react';
import { ComponentProps } from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

type LinkBaseProps = {
	isExternal?: boolean;
	noUnderline?: boolean;
};

// either a react-router-dom link or an anchor tag
export type LinkProps = LinkBaseProps & (RouterLinkProps | ComponentProps<'a'>);

export default function Link({ isExternal, noUnderline, ...props }: LinkProps) {
	const { children, className, title, ...rest } = props;

	const content = (
		<>
			<span>{children}</span>
			{isExternal && <ArrowSquareOut className="ml-1" />}
		</>
	);

	const getLinkProps = () => {
		return {
			title,
			className: clsx(className, { 'hover:underline': !noUnderline }, 'flex items-center'),
			target: isExternal ? '_blank' : undefined,
			rel: isExternal ? 'noopener noreferrer' : undefined,
		};
	};

	// if the props contain a `to` prop, it's a react-router-dom link
	if ('to' in rest) {
		return (
			<RouterLink {...getLinkProps()} {...rest}>
				{content}
			</RouterLink>
		);
	}

	return (
		<a {...getLinkProps()} {...rest}>
			{content}
		</a>
	);

	// return (
	// <RouterLink
	// 	title={title ?? props.to.toString()}
	// 	className={clsx(className, { 'hover:underline': !noUnderline }, 'flex items-center')}
	// 	target={isExternal ? '_blank' : undefined}
	// 	rel={isExternal ? 'noopener noreferrer' : undefined}
	// 	{...rest}
	// >
	// 	<span>{children}</span>

	// 	{isExternal && <ArrowSquareOut className="ml-1" />}
	// </RouterLink>
	// );
}
