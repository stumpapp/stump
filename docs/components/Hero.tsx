import { SiGithub } from '@icons-pack/react-simple-icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useTheme } from 'nextra-theme-docs'
import { useEffect, useMemo } from 'react'

import DownloadLinks from './DownloadLinks'

export default function Hero() {
	const { resolvedTheme } = useTheme()

	const imageURL = useMemo(
		() => (resolvedTheme === 'dark' ? '/images/landing-dark.png' : '/images/landing-light.png'),
		[resolvedTheme],
	)

	// Preload the other image in the background so if a user switches themes it
	// will already be loaded and there won't be a stutter
	useEffect(() => {
		const image = new Image()
		image.src = resolvedTheme === 'dark' ? '/images/landing-light.png' : '/images/landing-dark.png'
	}, [resolvedTheme, imageURL])

	return (
		<div className="mx-auto max-w-7xl px-6 pb-10 lg:flex lg:px-8 lg:pb-20 lg:pt-10">
			<div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
				<div className="flex flex-col items-center gap-5 md:items-start">
					<div>
						{/* TODO: logo? */}
						<motion.h1
							initial={{ opacity: 0, y: -40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="text-4xl font-bold tracking-tight text-black sm:text-6xl dark:text-neutral-100"
						>
							A lightning fast media server
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 40 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.25, duration: 0.5 }}
							className="text-neutral-650 mx-auto mt-5 max-w-md text-base sm:text-lg md:max-w-3xl md:text-xl dark:text-neutral-400"
						>
							Designed to be fast, beautiful, and simple. Curate your digital library and stream
							your media to any device.
						</motion.p>
					</div>

					<div className="flex justify-center space-x-2 md:mt-8 md:justify-start">
						<motion.div
							className="flex"
							initial={{ opacity: 0, scale: 0.5 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 1.1, duration: 0.5 }}
						>
							<Link
								className="bg-neutral-650 dark:hover:bg-neutral-650 hover:border-neutral-450 active:border-neutral-450 dark:active:border-neutral-450 dark:hover:border-neutral-450 dark:active:bg-neutral-650 flex cursor-pointer items-center rounded-md border border-neutral-500 px-3 py-1.5 text-sm font-medium text-neutral-800 transition-all duration-300 hover:bg-neutral-600 hover:text-white focus:outline-none active:bg-neutral-50 active:text-white dark:border-neutral-500 dark:bg-neutral-700 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white dark:active:opacity-90"
								href="/installation"
							>
								<span>Documentation</span>
							</Link>
						</motion.div>

						<motion.div
							className="flex"
							initial={{ opacity: 0, scale: 0.5 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 1.3, duration: 0.5 }}
						>
							<Link
								className="dark:active:border-neutral-650 dark:active:bg-neutral-650 flex cursor-pointer items-center space-x-2 rounded-md border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-neutral-700 transition-all duration-300 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none active:border-neutral-200 active:bg-neutral-50 active:text-neutral-600 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white dark:active:opacity-90"
								href="https://www.github.com/stumpapp/stump"
								target="_blank"
							>
								{/* @ts-expect-error: its fine */}
								<SiGithub />

								<span>See on Github</span>
							</Link>
						</motion.div>
					</div>

					<div className="mt-5">
						<DownloadLinks />
					</div>
				</div>
			</div>

			<div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-24">
				<div className="h-full max-w-3xl sm:max-w-5xl lg:max-w-none">
					<motion.img
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5, duration: 1 }}
						src={imageURL}
						alt="Demo"
						className="w-[60rem]"
					/>
				</div>
			</div>
		</div>
	)
}
