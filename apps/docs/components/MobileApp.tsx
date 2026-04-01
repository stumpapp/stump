import { Bug, ExternalLink, Globe, Lock, Router, Server, WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function MobileApp() {
	return (
		<div className="bg-white w-full dark:bg-[#0E0E0E]">
			<div className="max-w-7xl gap-16 px-6 py-10 lg:gap-20 lg:px-8 lg:py-24 mx-auto flex min-h-screen flex-col items-center">
				<div className="max-w-2xl md:text-center lg:mx-0 lg:max-w-xl lg:pt-8 mx-auto shrink-0">
					<h2 className="text-2xl font-bold tracking-tight text-black sm:text-4xl dark:text-neutral-100">
						Mobile app in early alpha
					</h2>

					<p className="text-neutral-650 mt-5 max-w-md text-base sm:text-lg md:max-w-3xl md:text-xl dark:text-neutral-400 mx-auto">
						An app for both iOS and Android is in the works, with a more tailored mobile-first
						experience
					</p>

					<div className="mt-5 gap-2 flex items-center justify-center">
						<Link
							className="bg-neutral-650 dark:hover:bg-neutral-650 hover:border-neutral-450 active:border-neutral-450 dark:active:border-neutral-450 dark:hover:border-neutral-450 dark:active:bg-neutral-650 rounded-md border-neutral-500 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-600 hover:text-white active:bg-neutral-50 active:text-white dark:border-neutral-500 dark:bg-neutral-700 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white flex cursor-pointer items-center border transition-all duration-300 focus:outline-none dark:active:opacity-90"
							href="/guides/mobile/app"
						>
							<span>Documentation</span>
						</Link>

						{/* https://play.google.com/store/apps/details?id=com.stumpapp.stump */}
						<Link
							className="dark:active:border-neutral-650 dark:active:bg-neutral-650 space-x-2 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 active:border-neutral-200 active:bg-neutral-50 active:text-neutral-600 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white flex cursor-pointer items-center border border-transparent bg-transparent transition-all duration-300 focus:outline-none dark:active:opacity-90"
							href="/guides/mobile/app#getting-the-app"
						>
							<span>Google Beta</span>
						</Link>

						<Link
							className="dark:active:border-neutral-650 dark:active:bg-neutral-650 space-x-2 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 active:border-neutral-200 active:bg-neutral-50 active:text-neutral-600 dark:bg-opacity-90 dark:text-neutral-200 dark:shadow-sm dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:hover:bg-opacity-100 dark:hover:text-white dark:active:text-white flex cursor-pointer items-center border border-transparent bg-transparent transition-all duration-300 focus:outline-none dark:active:opacity-90"
							href="https://testflight.apple.com/join/a4srR634"
							target="_blank"
						>
							<span>TestFlight</span>
							<ExternalLink className="ml-2 h-4 w-4" />
						</Link>
					</div>
				</div>

				<div className="max-w-7xl lg:px-8 mx-auto">
					<img src="/images/expo-preview.png" className="w-auto object-scale-down" />
				</div>

				<div className="max-w-2xl gap-x-6 gap-y-10 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16 mx-auto grid grid-cols-1 text-gray-300">
					{features.map((feature) => (
						<div className="pl-9 relative" key={feature.title}>
							<dt className="font-semibold text-black dark:text-neutral-100 inline">
								<feature.icon className="left-1 top-1 h-5 w-5 absolute" />
								{feature.title}
							</dt>{' '}
							<dd className="text-neutral-650 dark:text-neutral-400 inline">
								{feature.description}
							</dd>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

const features = [
	{
		title: 'Cross-platform',
		description:
			'Available on both iOS and Android devices, open source and built with React Native',
		icon: Bug,
	},
	{
		title: 'Offline reading support',
		description: "Download your content for later to read even when you're offline",
		icon: WifiOff,
	},
	{
		title: 'Progress sync',
		description:
			'Automatically sync your reading progress to your Stump server and across all your devices',
		icon: Router,
	},
	{
		title: 'OPDS v2 compatible',
		description: 'Browse any OPDS v2 catalog to stream and download your content',
		icon: Server,
	},
	{
		title: 'Security and access',
		description:
			'Permissions managed by the server are enforced in the app, so you only need to configure access rules once',
		icon: Lock,
	},
	{
		title: 'Localization',
		description: 'Available in multiple languages, with more translations coming soon',
		icon: Globe,
	},
]
