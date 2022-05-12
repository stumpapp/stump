import clsx from 'clsx';
import React from 'react';
import { Twitter, Discord, Github } from '@icons-pack/react-simple-icons';
import { Link } from 'react-router-dom';

const navigation = {
	about: [
		{ name: 'FAQ', href: '/faq', disabled: false },
		{ name: 'Getting Started', href: '/guides/', disabled: false },
		{ name: 'Changelog', href: '#', disabled: true },
	],
	downloads: [{ name: 'Coming Soon!', href: '#', disabled: true }],
	developers: [
		{
			name: 'Documentation',
			href: 'https://github.com/aaronleopold/stump#development-setup',
			disabled: false,
		},
		{
			name: 'Contribute',
			href: 'https://github.com/aaronleopold/stump/blob/main/CONTRIBUTING.md',
			disabled: false,
		},
	],
	org: [
		{
			name: 'License',
			href: 'https://github.com/aaronleopold/stump/blob/main/LICENSE',
			disabled: false,
		},
	],
	social: [
		{
			name: 'Twitter',
			href: '#',
			icon: Twitter,
			disabled: true,
		},
		{
			name: 'GitHub',
			href: 'https://github.com/aaronleopold/stump',
			icon: Github,
		},
		{
			name: 'Discord',
			href: 'https://discord.gg/63Ybb7J3as',
			icon: Discord,
		},
	],
};

const DISABLED_URL = '';

interface LinkSectionProps {
	title: string;
	links: { name: string; href: string; disabled?: boolean }[];
}

const LinkSection = ({ title, links }: LinkSectionProps) => {
	return (
		<div className="col-span-1 flex flex-col space-y-2">
			<h3 className="text-xs font-semibold text-gray-200 tracking-wider uppercase">{title}</h3>
			<ul role="list" className="mt-4 space-y-4">
				{links.map((item) => (
					<li key={item.name}>
						<Link
							to={item.disabled ? DISABLED_URL : item.href}
							className={clsx(
								item.disabled
									? 'pointer-events-none text-gray-500'
									: 'text-gray-300 hover:text-gray-100',
								'text-base',
							)}
						>
							{item.name}
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
			className="bg-gray-950 w-full border-t border-gray-800"
			aria-labelledby="footer-heading"
		>
			<h2 id="footer-heading" className="sr-only">
				Stump
			</h2>
			<div className="max-w-[85rem] mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
				<div className="grid grid-cols-2 gap-6 lg:gap-8 lg:grid-cols-6">
					<div className="space-y-6 col-span-2 mb-12 lg:mb-0">
						<img className="h-10" src="/favicon.png" alt="Stump" />

						<div className="flex flex-col space-y-1">
							<h3 className="font-bold text-xl text-gray-200">Stump</h3>
							<p className="text-sm text-gray-200">
								&copy; Copyright {new Date().getFullYear()} Aaron Leopold
							</p>
						</div>

						<div className="flex space-x-3">
							{navigation.social.map((item) => (
								<a
									key={item.name}
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
									className="text-gray-300 hover:text-gray-100"
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
