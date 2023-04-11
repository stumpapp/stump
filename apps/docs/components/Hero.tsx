import { SiGithub } from '@icons-pack/react-simple-icons'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
	return (
		<div className="relative">
			<div className="text-center">
				<motion.h1
					initial={{ opacity: 0, y: -40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-4xl tracking-tight font-extrabold text-neutral-900 dark:text-neutral-100 sm:text-5xl md:text-6xl"
				>
					<span className="block xl:inline">A lightning fast</span>{' '}
					<span className="block xl:inline">media server.</span>
				</motion.h1>
				<motion.p
					initial={{ opacity: 0, y: 40 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.25, duration: 0.5 }}
					className="mt-3 max-w-md mx-auto text-base text-neutral-650 dark:text-neutral-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
				>
					Free, open source, self-hosting for all your comic books, manga and digital book
					collections. Supports the most popular reading formats.
				</motion.p>

				<div className="mt-5 max-w-md mx-auto flex justify-center space-x-2 md:mt-8">
					<motion.div
						className="flex"
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 1.1, duration: 0.5 }}
					>
						<Link
							className="cursor-pointer border rounded-md flex items-center transition-all duration-300 focus:outline-none dark:bg-opacity-90 dark:hover:bg-opacity-100 dark:active:opacity-90 bg-neutral-650 dark:bg-neutral-700 dark:hover:bg-neutral-650 border-neutral-500 dark:border-neutral-500 hover:border-neutral-450 active:border-neutral-450 dark:active:border-neutral-450 dark:hover:border-neutral-450 dark:shadow-sm hover:bg-neutral-600 active:bg-neutral-50 dark:hover:bg-neutral-700 dark:active:bg-neutral-650 text-neutral-800 hover:text-white active:text-white dark:text-neutral-200 dark:active:text-white dark:hover:text-white py-1.5 px-3 text-sm font-medium"
							href="/installation"
						>
							<span>Read Documentation</span>
						</Link>
					</motion.div>

					<motion.div
						className="flex"
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 1.3, duration: 0.5 }}
					>
						<Link
							className="cursor-pointer border rounded-md transition-all duration-300 focus:outline-none dark:bg-opacity-90 dark:hover:bg-opacity-100 dark:active:opacity-90 bg-transparent border-transparent hover:border-neutral-200 active:border-neutral-200 dark:active:border-neutral-650 dark:hover:border-neutral-500 dark:shadow-sm hover:bg-neutral-50 active:bg-neutral-50 dark:hover:bg-neutral-700 dark:active:bg-neutral-650 text-neutral-700 hover:text-neutral-900 active:text-neutral-600 dark:text-neutral-200 dark:active:text-white dark:hover:text-white py-1.5 px-3 text-sm font-medium flex items-center space-x-2"
							href="https://www.github.com/aaronleopold/stump"
							target="_blank"
						>
							<SiGithub />

							<span>See on Github</span>
						</Link>
					</motion.div>
				</div>
			</div>
		</div>
	)
}
