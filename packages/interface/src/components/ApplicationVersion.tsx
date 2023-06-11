import { useStumpVersion } from '@stump/client'
import { Heading, HoverCard, Link, Text, TEXT_VARIANTS } from '@stump/components'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import { ExternalLink } from 'lucide-react'

dayjs.extend(LocalizedFormat)

export default function ApplicationVersion() {
	const version = useStumpVersion()

	return (
		<HoverCard
			trigger={
				<Link
					href="https://github.com/stumpapp/stump"
					target="__blank"
					rel="noopener noreferrer"
					className="flex items-center space-x-2 text-sm"
					underline={false}
				>
					<span>v{version?.semver}</span>
					<ExternalLink className="h-3 w-3" />
				</Link>
			}
		>
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
					<Heading className="text-xs">Version Information</Heading>
				</div>
				<div className="flex flex-col gap-1">
					{version?.semver && (
						<Text className="text-xs">
							Semantic Version: <span className={TEXT_VARIANTS.muted}>{version.semver}</span>
						</Text>
					)}
					{version?.rev && (
						<Text className="text-xs">
							Commit: <span className={TEXT_VARIANTS.muted}>{version.rev}</span>
						</Text>
					)}
					{version?.compile_time && (
						<Text className="text-xs">
							Build Date:{' '}
							<span className={TEXT_VARIANTS.muted}>
								{dayjs(version.compile_time).format('LLL')}
							</span>
						</Text>
					)}
				</div>
			</div>
		</HoverCard>
	)
}
