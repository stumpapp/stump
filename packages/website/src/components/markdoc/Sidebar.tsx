import React from 'react';
import Link from '../ui/Link';
import { useRouter } from 'next/router';
import { sidebarItems } from './sidebarItems';
import clsx from 'clsx';

export default function Sidebar() {
	const router = useRouter();

	return (
		<nav className="md:py-4 flex flex-col shrink-0 space-y-8 w-[14rem] max-h-[calc(100vh-56px)] overflow-y-scroll scrollbar-hide">
			{sidebarItems.map((item) => {
				const heading = <h3 className="font-semibold text-xl">{item.title}</h3>;

				const activeStyle = (active: boolean) =>
					clsx(active ? 'text-brand' : 'hover:text-brand transition-colors duration-200');

				if (item.links.length === 1) {
					const link = item.links[0];
					const isActive = router.pathname === link.href;

					return (
						<Link
							noUnderline
							key={link.href}
							className={activeStyle(isActive)}
							href={item.links[0].href}
						>
							{heading}
						</Link>
					);
				}

				return (
					<div className="flex flex-col space-y-1" key={item.title}>
						{heading}
						<ul className="flex flex-col space-y-2 ml-4">
							{item.links.map((link) => {
								const isActive = router.pathname === link.href;
								return (
									<li key={link.href} className={activeStyle(isActive)}>
										<Link noUnderline href={link.href}>
											{link.description}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				);
			})}
		</nav>
	);
}
