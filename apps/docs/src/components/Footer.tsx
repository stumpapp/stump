import clsx from 'clsx';
import React from 'react';
import { Discord, Github, Opencollective, Twitter } from '@icons-pack/react-simple-icons';
import Link from 'next/link';

const navigation = {
	nav: [
		{ name: 'Home', href: '/', disabled: false },
		{ name: 'Installation', href: '/installation', disabled: false },
		{ name: 'Guides', href: '/guides', disabled: false },
	],
	social: [
		{
			name: 'Open Collective',
			href: 'https://opencollective.com/stump',
			icon: Opencollective,
			isExternal: true,
		},
		{
			name: 'Twitter',
			href: 'https://twitter.com/stumpapp_',
			icon: Twitter,
			isExternal: true,
		},
		{
			name: 'GitHub',
			href: 'https://github.com/aaronleopold/stump',
			icon: Github,
			isExternal: true,
		},
		{
			name: 'Discord',
			href: 'https://discord.gg/63Ybb7J3as',
			icon: Discord,
			isExternal: true,
		},
	],
};

export default function Footer() {
	return (
		<footer
			className="bg-gray-75 dark:bg-gray-950 w-full border-t dark:border-gray-800"
			aria-labelledby="footer-heading"
		>
			<div className="flex flex-col space-y-7 items-center justify-center max-w-[85rem] mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
				<div className="flex space-x-8 items-center">
					{navigation.nav.map((item) => (
						<Link key={item.href} href={item.href} passHref>
							<a
								className={clsx(
									item.disabled
										? 'pointer-events-none text-gray-400 dark:text-gray-500'
										: 'text-gray-750 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100',
									'text-base',
								)}
							>
								{item.name}
							</a>
						</Link>
					))}
				</div>
				<div className="flex space-x-6 items-center">
					{navigation.social.map((item) => (
						<a
							key={item.name}
							href={item.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-750 hover:text-gray-650 dark:text-gray-300 dark:hover:text-gray-100"
						>
							<span className="sr-only">{item.name}</span>
							<item.icon className="h-6 w-6" aria-hidden="true" />
						</a>
					))}
				</div>

				<div className="flex items-center space-x-4">
					<img className="h-8" src="/favicon.ico" alt="Stump" />

					<p className="text-sm text-gray-700 dark:text-gray-200">
						&copy; Copyright {new Date().getFullYear()} Aaron Leopold
					</p>
				</div>
			</div>
		</footer>
	);
}
