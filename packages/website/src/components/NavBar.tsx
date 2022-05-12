import React, { useEffect, useState } from 'react';
import { Github, Discord } from '@icons-pack/react-simple-icons';
import clsx from 'clsx';
import { CloudArrowDown } from 'phosphor-react';
import { Link } from 'react-router-dom';

const social = [
	{
		name: 'GitHub',
		href: 'https://github.com/aaronleopold/stump',
		icon: Github,
		disabled: false,
	},
	{
		name: 'Download',
		href: 'https://github.com/aaronleopold/stump/releases',
		icon: () => <CloudArrowDown weight="fill" className="h-6 w-6" />,
		disabled: true,
	},
	{
		name: 'Discord',
		href: 'https://discord.gg/63Ybb7J3as',
		icon: Discord,
		disabled: false,
	},
];

const DISABLED_URL = '';

export default function NavBar() {
	const [scrollPos, setScrollPos] = useState(0);

	useEffect(() => {
		function handleScroll(_e: Event) {
			setScrollPos(window.scrollY);
		}

		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return (
		<nav
			className={clsx(
				scrollPos < 25 ? 'bg-transparent border-b-transparent' : 'bg-gray-1000 border-b-gray-800',
				'border-b sticky top-0 z-50 w-full transition-all duration-200',
			)}
		>
			<div className="w-full flex justify-between text-gray-100 max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-3">
				<Link to="/" className="flex items-center space-x-2">
					<img className="h-8" src="/favicon.png" alt="Stump" />
					<h3 className="font-bold text-xl text-gray-200">Stump</h3>
				</Link>

				<div className="flex items-center">
					<div className="flex space-x-4">
						{social.map((item) => (
							<a
								key={item.name}
								title={item.name}
								href={item.disabled ? DISABLED_URL : item.href}
								target="_blank"
								rel="noopener noreferrer"
								className={clsx(
									item.disabled
										? 'text-gray-500 pointer-events-none'
										: 'text-gray-300 hover:text-gray-100',
								)}
							>
								<span className="sr-only">{item.name}</span>
								<item.icon className="h-6 w-6" aria-hidden="true" />
							</a>
						))}
					</div>
				</div>
			</div>
		</nav>
	);
}
