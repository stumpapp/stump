import { SiDiscord, SiGithub, SiOpencollective, SiTwitter } from '@icons-pack/react-simple-icons'
import clsx from 'clsx'
import Link from 'next/link'
import React from 'react'

const navigation = {
	nav: [
		{ disabled: false, href: '/', name: 'Home' },
		{ disabled: false, href: '/installation', name: 'Installation' },
		{ disabled: false, href: '/guides', name: 'Guides' },
	],
	social: [
		{
			href: 'https://opencollective.com/stump',
			icon: SiOpencollective,
			isExternal: true,
			name: 'Open Collective',
		},
		{
			href: 'https://twitter.com/stumpapp_',
			icon: SiTwitter,
			isExternal: true,
			name: 'Twitter',
		},
		{
			href: 'https://github.com/stumpapp/stump',
			icon: SiGithub,
			isExternal: true,
			name: 'GitHub',
		},
		{
			href: 'https://discord.gg/63Ybb7J3as',
			icon: SiDiscord,
			isExternal: true,
			name: 'Discord',
		},
	],
}

export default function Footer() {
	return (
		<footer
			className="w-full border-t bg-[#FAFAFA] dark:border-neutral-800 dark:bg-[#0E0E0E]"
			aria-labelledby="footer-heading"
		>
			<div className="mx-auto flex max-w-[85rem] flex-col items-center justify-center space-y-7 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
				<div className="flex items-center space-x-8">
					{navigation.nav.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={clsx(
								item.disabled
									? 'pointer-events-none text-gray-400 dark:text-gray-500'
									: 'text-gray-750 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100',
								'text-base',
							)}
						>
							{item.name}
						</Link>
					))}
				</div>
				<div className="flex items-center space-x-6">
					{navigation.social.map((item) => (
						<a
							key={item.name}
							href={item.href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-750 hover:text-gray-650 dark:text-gray-300 dark:hover:text-gray-100"
						>
							<span className="sr-only">{item.name}</span>
							{/* @ts-expect-error: Its fine */}
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
	)
}
