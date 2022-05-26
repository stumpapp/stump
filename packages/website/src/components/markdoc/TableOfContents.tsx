import clsx from 'clsx';
import React from 'react';
import Link from '~components/ui/Link';

export interface TocEntry {
	level: number;
	id: string;
	title: string;
}

interface TableOfContentsProps {
	toc: TocEntry[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
	const items = toc.filter((item) => item.id && (item.level === 2 || item.level === 3));

	return (
		<nav className="hidden lg:inline-block w-[12rem] text-sm sticky lg:top-[calc(56px+16px)] top-0 self-start justify-end md:ml-4">
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
