import { SiAndroid, SiApple, SiDocker, SiLinux, SiWindows10 } from '@icons-pack/react-simple-icons'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import React from 'react'

const BASE_DELAY = 1.5
const getDelay = (idx: number) => BASE_DELAY + (idx + 1) * 0.25

export default function DownloadLinks() {
	return (
		<div className="relative flex w-full items-center justify-center space-x-2">
			{links.map((link, idx) => (
				<motion.div
					key={idx}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: getDelay(idx), duration: 0.25 }}
				>
					<a
						className={clsx(
							'flex items-center rounded-md border border-transparent bg-transparent p-1 text-sm font-medium text-neutral-700 transition-all duration-300  dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm',
							{ 'cursor-not-allowed opacity-50': link.disabled },
							{
								'hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none active:border-neutral-200 active:bg-neutral-50 active:text-neutral-600 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white dark:active:opacity-90':
									!link.disabled,
							},
						)}
						href={link.disabled ? undefined : link.href}
						target="_blank"
						rel="noreferrer"
					>
						{/* @ts-expect-error: Its fine */}
						<link.icon className="h-5 w-5" />
					</a>
				</motion.div>
			))}
		</div>
	)
}

const links = [
	{
		disabled: true,
		href: '#',
		icon: SiLinux,
		title: 'Linux',
	},
	{
		disabled: true,
		href: '#',
		icon: SiApple,
		title: 'macOS',
	},
	{
		disabled: true,
		href: '#',
		icon: SiWindows10,
		title: 'Windows',
	},
	{
		href: 'https://hub.docker.com/r/aaronleopold/stump',
		icon: SiDocker,
		title: 'Docker',
	},
	{
		disabled: true,
		href: '#',
		icon: SiAndroid,
		title: 'Android',
	},
]
