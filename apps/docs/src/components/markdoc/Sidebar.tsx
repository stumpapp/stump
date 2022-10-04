import React, { useEffect, useState } from 'react';
import Link from '../ui/Link';
import { NextRouter, useRouter } from 'next/router';
import { sidebarItems } from './sidebarItems';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from 'phosphor-react';
import IconButton from '~components/ui/IconButton';
import { useMediaQuery } from '~hooks/useMediaQuery';

function SidebarContent({ router }: { router: NextRouter }) {
	return (
		<>
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
		</>
	);
}

const SIDEBAR_ENTER = {
	opacity: 1,
	x: 0,
};
const SIDEBAR_EXIT = {
	opacity: 0.75,
	x: '-100%',
};

const SIDEBAR_INITAL = SIDEBAR_EXIT;

export default function Sidebar() {
	const router = useRouter();

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const isAtLeastMd = useMediaQuery('(min-width: 768px)');

	useEffect(() => {
		if (isAtLeastMd && sidebarOpen) {
			setSidebarOpen(false);
		}
	}, [isAtLeastMd, sidebarOpen]);

	useEffect(() => {
		setSidebarOpen(false);
	}, [router.asPath]);

	function toggle() {
		if (window && !window.matchMedia('min-width: 768px').matches) {
			setSidebarOpen((prev) => !prev);
		}
	}

	return (
		<>
			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						onClick={() => setSidebarOpen(false)}
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.5 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className="fixed inset-0 z-50 bg-gray-500"
					/>
				)}
			</AnimatePresence>

			<div className="md:hidden fixed right-[1.5rem] bottom-[1.5rem] sm:right-[1rem] sm:bottom-[1rem] z-[100]">
				<IconButton onClick={toggle} variant="primary" size="md">
					{sidebarOpen ? <X /> : <List />}
				</IconButton>
			</div>

			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						initial={SIDEBAR_INITAL}
						animate={SIDEBAR_ENTER}
						exit={SIDEBAR_EXIT}
						transition={{
							ease: 'easeInOut',
							duration: 0.2,
						}}
						className="lg:hidden fixed h-screen bg-white dark:bg-gray-800 p-2 z-[100] left-0 top-0 shadow-[5px_0_5px_-5px_rgb(0,0,0,0.1)]"
					>
						<nav className="md:hidden p-4 flex flex-col shrink-0 space-y-8 w-[16rem] lg:w-[14rem] max-h-[calc(100vh-56px)] overflow-y-scroll scrollbar-hide">
							<SidebarContent router={router} />
						</nav>
					</motion.div>
				)}
			</AnimatePresence>

			{/* FIXME: x axis is not aligned on some pages? */}
			<nav className="hidden text-sm sticky lg:top-[calc(56px+16px)] top-0 md:flex md:py-4 md:mr-4 flex-col shrink-0 space-y-7 w-[12rem] md:w-[14rem] max-h-[calc(100vh-56px)] overflow-y-scroll scrollbar-hide">
				<SidebarContent router={router} />
			</nav>
		</>
	);
}
