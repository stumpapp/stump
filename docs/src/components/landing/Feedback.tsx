import { SiDiscord } from '@icons-pack/react-simple-icons'
import { Bug } from 'lucide-react'

export default function Feedback() {
	return (
		<div className="max-w-7xl gap-20 px-6 py-10 lg:px-8 lg:py-24 mx-auto flex w-full flex-col">
			<div className="gap-5 flex flex-col">
				<div className="text-2xl sm:text-4xl">
					<h2 className="font-bold tracking-tight text-black dark:text-neutral-100">Feedback</h2>
				</div>

				<p className="text-neutral-650 text-base sm:text-lg md:max-w-3xl md:text-xl dark:text-neutral-400">
					Stump is a community-driven project. The best way to improve the software is to hear and
					act on your feedback
				</p>
			</div>

			<div className="gap-x-6 gap-y-10 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16 grid grid-cols-1">
				{methods.map((method) => (
					<div className="pl-9 relative" key={method.title}>
						<dt className="font-semibold text-black dark:text-neutral-100 inline">
							{/* @ts-expect-error: its fine */}
							<method.icon className="left-1 top-1 h-5 w-5 absolute" />
							{method.title}
						</dt>{' '}
						<dd className="text-neutral-650 dark:text-neutral-400 inline">{method.description}</dd>
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
					className="text-black dark:text-neutral-100 underline"
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
					className="text-black dark:text-neutral-100 underline"
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
