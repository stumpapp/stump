import clsx from 'clsx';
import React from 'react';
import Link from '~components/ui/Link';

interface TableOfContentsProps {
	toc: any[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
	const items = toc.filter(
		(item) => item.id && (item.level === 2 || item.level === 3) && item.title !== 'Next steps',
	);
	return (
		<nav className="w-[12rem] text-sm sticky md:top-[calc(56px+16px)] top-0 self-start justify-end">
			{items.length > 1 ? (
				<ul className="flex flex-col space-y-3 border-l ml-2 pl-4">
					{items.map((item) => {
						const href = `#${item.id}`;
						const isActive = typeof window !== 'undefined' && window.location.hash === href;
						return (
							<li
								key={href}
								className={clsx(
									isActive && 'text-brand',
									'hover:text-brand transition-colors duration-200',
								)}
							>
								<Link noUnderline href={href}>
									{item.title}
								</Link>
							</li>
						);
					})}
				</ul>
			) : null}
		</nav>
	);
}
