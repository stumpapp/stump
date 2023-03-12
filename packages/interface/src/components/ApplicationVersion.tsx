import { useStumpVersion } from '@stump/client'
import { Heading, HoverCard, Link } from '@stump/components'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import { ArrowSquareOut } from 'phosphor-react'

dayjs.extend(LocalizedFormat)

export default function ApplicationVersion() {
	const version = useStumpVersion()

	return (
		<HoverCard
			trigger={
				<Link
					href="https://github.com/aaronleopold/stump"
					target="__blank"
					rel="noopener noreferrer"
					className="flex items-center space-x-2 text-sm"
					underline={false}
				>
					<span>v{version?.semver}</span>
					<ArrowSquareOut />
				</Link>
			}
		>
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
					<Heading className="text-xs">Version Information</Heading>
				</div>
				<div className="flex flex-col gap-1">
					{version?.semver && <span className="text-xs">Semantic Version: {version.semver}</span>}
					{version?.rev && <span className="text-xs">Commit: {version.rev}</span>}
					{version?.compile_time && (
						<span className="text-xs">Build Date: {dayjs(version.compile_time).format('LLL')}</span>
					)}
				</div>
			</div>
		</HoverCard>
	)
}
