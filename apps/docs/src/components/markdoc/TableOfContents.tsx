import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import Link from '~components/ui/Link';

export interface TocEntry {
	level: number;
	id: string;
	title: string;
}

interface TableOfContentsProps {
	toc: TocEntry[];
}

// FIXME: not perfect, tweak this...
const IN_VIEW_OFFSET = 100;

export default function TableOfContents({ toc }: TableOfContentsProps) {
	const items = toc.filter((item) => item.id && (item.level === 2 || item.level === 3));

	const [currentSection, setCurrentSection] = useState<string | null>(null);

	useEffect(() => {
		// get the current section based on scroll position
		function handleScroll() {
			const sections = items.map((item) => document.getElementById(item.id));
			const current = sections.find((section) => {
				if (!section) return false;
				const { top } = section.getBoundingClientRect();
				return top + IN_VIEW_OFFSET >= 0 && top + IN_VIEW_OFFSET <= window?.innerHeight;
			});

			if (current) {
				setCurrentSection(current.id);
			}
		}
		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, [items]);

	return (
		<nav className="hidden lg:inline-block w-[12rem] text-sm sticky lg:top-[calc(56px+16px)] top-0 self-start justify-end md:ml-4">
			{items.length > 1 ? (
				<ul className="flex flex-col space-y-3 border-l ml-2 pl-4">
					{items.map((item) => {
						const href = `#${item.id}`;
						const isActive = currentSection === item.id;

						// console.log({ currentSection, itemId: item.id, isActive });

						return (
							<li
								key={href}
								className={clsx(
									{ 'text-brand': isActive },
									{ 'ml-2 text-xs': item.level === 3 },
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
