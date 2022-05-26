import clsx from 'clsx';
import React from 'react';
import { Discord, Github, Twitter } from '@icons-pack/react-simple-icons';
import Link from 'next/link';

const navigation = {
	about: [
		{ name: 'FAQ', href: '/faq', disabled: false },
		{ name: 'Getting Started', href: '/installation', disabled: false },
		// { name: 'Changelog', href: '#', disabled: true },
	],
	downloads: [{ name: 'Coming Soon!', href: '#', disabled: true }],
	developers: [
		{
			name: 'Documentation',
			href: 'https://github.com/aaronleopold/stump/tree/develop#development-setup',
			isExternal: true,
			disabled: false,
		},
		{
			name: 'Contribute',
			href: '/contributing',
			isExternal: false,
			disabled: false,
		},
	],
	org: [
		{
			name: 'License',
			href: 'https://github.com/aaronleopold/stump/blob/main/LICENSE',
			isExternal: true,
			disabled: false,
		},
	],
	social: [
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

interface LinkSectionProps {
	title: string;
	links: { name: string; href: string; disabled?: boolean; isExternal?: boolean }[];
}

const LinkSection = ({ title, links }: LinkSectionProps) => {
	return (
		<div className="col-span-1 flex flex-col space-y-2 my-1 sm:my-0">
			<h3 className="text-xs font-semibold text-gray-850 dark:text-gray-200 tracking-wider uppercase mb-1">
				{title}
			</h3>
			<ul role="list" className="mt-4 space-y-4">
				{links.map((item) => (
					<li key={item.name}>
						<Link href={item.href} passHref>
							<a
								className={clsx(
									item.disabled
										? 'pointer-events-none text-gray-400 dark:text-gray-500'
										: 'text-gray-750 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100',
									'text-base',
								)}
								target={item.isExternal ? '_blank' : undefined}
							>
								{item.name}
							</a>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
};

export default function Footer() {
	return (
		<footer
			className="bg-gray-75 dark:bg-gray-950 w-full border-t dark:border-gray-800"
			aria-labelledby="footer-heading"
		>
			<h2 id="footer-heading" className="sr-only">
				Stump
			</h2>
			<div className="max-w-[85rem] mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
				<div className="grid grid-cols-2 gap-6 lg:gap-8 lg:grid-cols-6">
					<div className="space-y-6 col-span-2 mb-12 lg:mb-0">
						<img className="h-12" src="/favicon.ico" alt="Stump" />

						<div className="flex flex-col space-y-1">
							<h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">Stump</h3>
							<p className="text-sm text-gray-700 dark:text-gray-200">
								&copy; Copyright {new Date().getFullYear()} Aaron Leopold
							</p>
						</div>

						<div className="flex space-x-3 items-center">
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
					</div>

					<LinkSection title="About" links={navigation.about} />
					<LinkSection title="Downloads" links={navigation.downloads} />
					<LinkSection title="Developers" links={navigation.developers} />
					<LinkSection title="Legal" links={navigation.org} />
				</div>
			</div>
		</footer>
	);
}
