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
		<Component className={clsx('heading relative', className)}>
			{/* 56px is top nav height, giving 5px extra for space */}
			<div className="absolute -top-[calc(56px+5px)]" id={id} />
			{children}
		</Component>
	);

	if (isDocsHeading && level !== 1) {
		return (
			// wrapping in div so it doesn't go full width... blech
			<div
				className={clsx('flex', {
					'pb-[0.3em] border-b border-b-gray-150 dark:border-b-[#373e47]': level === 2,
				})}
			>
				<a href={`#${id}`}>
					{component}

					<style jsx>
						{`
							a :global(.heading::after) {
								opacity: 0;
								content: '  #';
								color: rgb(196 130 89);
								transition: opacity 250ms ease;
							}
							a :global(.heading:hover::after) {
								opacity: 1;
							}
						`}
					</style>
				</a>
			</div>
		);
	}

	return component;
}
