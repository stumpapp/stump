import clsx from 'clsx';
import { useRouter } from 'next/router';
import React, { ComponentProps } from 'react';

interface HeadingProps extends ComponentProps<'h1'> {
	level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export default function Heading({ level = 1, children, className, id }: HeadingProps) {
	const router = useRouter();

	// is docs heading when router.pathname isn't on /
	const isDocsHeading = router.pathname !== '/';

	const Component = `h${level}`;

	const component = (
		// @ts-ignore: this is fine I promise
		<Component className={clsx('heading', className)}>
			<div id={id} />
			{children}
			{/* <style jsx>
				{`
					div {
						position: absolute;
						top: calc(-1 * (var(--nav-height) + 44px));
					}
				`}
			</style> */}
		</Component>
	);

	if (isDocsHeading && level !== 1) {
		return (
			<a className="" href={`#${id}`}>
				{component}

				<style jsx>
					{`
						a :global(.heading::after) {
							opacity: 0;
							content: '  #';
							transition: opacity 250ms ease;
						}
						a :global(.heading:hover::after) {
							opacity: 1;
						}
					`}
				</style>
			</a>
		);
	}

	return component;
}
