import { SiDiscord } from '@icons-pack/react-simple-icons'
import { Bug } from 'lucide-react'

export default function Feedback() {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-6 py-10 lg:px-8 lg:py-24">
			<div className="flex flex-col gap-5">
				<h2 className="text-2xl font-bold tracking-tight text-black sm:text-4xl dark:text-neutral-100">
					Feedback
				</h2>

				<p className="text-neutral-650 text-base sm:text-lg md:max-w-3xl md:text-xl dark:text-neutral-400">
					Stump is a community-driven project. The best way to improve the software is to hear and
					act on your feedback
				</p>
			</div>

			<div className="grid grid-cols-1 gap-x-6 gap-y-10 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
				{methods.map((method) => (
					<div className="relative pl-9" key={method.title}>
						<dt className="inline font-semibold text-black dark:text-neutral-100">
							{/* @ts-expect-error: its fine */}
							<method.icon className="absolute left-1 top-1 h-5 w-5" />
							{method.title}
						</dt>{' '}
						<dd className="text-neutral-650 inline dark:text-neutral-400">{method.description}</dd>
					</div>
				))}
			</div>
		</div>
	)
}

const methods = [
	{
		title: 'Create an issue',
		description: (
			<>
				The best way to provide feedback is to{' '}
				<a
					href="https://github.com/stumpapp/stump/issues"
					className="text-black underline dark:text-neutral-100"
					target="_blank"
					rel="noreferrer"
				>
					create an issue
				</a>{' '}
				on the GitHub repository
			</>
		),
		icon: Bug,
	},
	{
		title: 'Join the Discord',
		description: (
			<>
				Join the{' '}
				<a
					href="https://discord.gg/63Ybb7J3as"
					className="text-black underline dark:text-neutral-100"
					target="_blank"
					rel="noreferrer"
				>
					Discord server
				</a>{' '}
				to discuss the project and provide feedback, or ask for help
			</>
		),
		icon: SiDiscord,
	},
]
