import {
	SiAndroid,
	SiApple,
	SiDocker,
	SiIos,
	SiLinux,
	SiWindows10,
} from '@icons-pack/react-simple-icons'
import clsx from 'clsx'
import { motion } from 'framer-motion'

// Base delay to start after hero animations
const BASE_DELAY = 1.4

const linkVariants = {
	hidden: {
		opacity: 0,
		y: 8,
		filter: 'blur(8px)',
		scale: 0.95,
	},
	visible: (index: number) => ({
		opacity: 1,
		y: 0,
		filter: 'blur(0px)',
		scale: 1,
		transition: {
			duration: 0.6,
			delay: BASE_DELAY + index * 0.08,
			ease: [0.33, 1, 0.68, 1],
		},
	}),
}

const hoverVariants = {
	hover: {
		scale: 1.05,
		transition: {
			duration: 0.3,
			ease: [0.33, 1, 0.68, 1],
		},
	},
	tap: {
		scale: 0.95,
	},
}

export default function DownloadLinks() {
	return (
		<div className="relative flex w-full items-start justify-center space-x-2 md:justify-start">
			{links.map((link, idx) => (
				<motion.div
					key={idx}
					custom={idx}
					initial="hidden"
					animate="visible"
					variants={linkVariants}
					whileHover={!link.disabled ? 'hover' : undefined}
					whileTap={!link.disabled ? 'tap' : undefined}
					{...(link.disabled ? {} : hoverVariants)}
				>
					<a
						className={clsx(
							'flex items-center rounded-md border border-transparent bg-transparent p-1 text-sm font-medium text-neutral-700 transition-all duration-300 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm',
							{ 'cursor-not-allowed opacity-50': link.disabled },
							{
								'hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none active:border-neutral-200 active:bg-neutral-50 active:text-neutral-600 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white dark:active:opacity-90':
									!link.disabled,
							},
						)}
						href={link.disabled ? undefined : link.href}
						target="_blank"
						rel="noreferrer"
						aria-label={link.title}
					>
						<link.icon className="h-5 w-5" />
					</a>
				</motion.div>
			))}
		</div>
	)
}

type Link = {
	href: string
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
	title: string
	disabled?: boolean
}

const links: Link[] = [
	{
		href: 'https://github.com/stumpapp/stump/releases/latest',
		icon: SiLinux,
		title: 'Linux',
	},
	{
		href: 'https://github.com/stumpapp/stump/releases/latest',
		icon: SiApple,
		title: 'macOS',
	},
	{
		href: 'https://github.com/stumpapp/stump/releases/latest',
		icon: SiWindows10,
		title: 'Windows',
	},
	{
		href: 'https://hub.docker.com/r/aaronleopold/stump',
		icon: SiDocker,
		title: 'Docker',
	},
	{
		href: '/guides/mobile/app#getting-the-app',
		icon: SiAndroid,
		title: 'Android',
	},
	{
		href: 'https://testflight.apple.com/join/a4srR634',
		icon: SiIos,
		title: 'iOS',
	},
]
