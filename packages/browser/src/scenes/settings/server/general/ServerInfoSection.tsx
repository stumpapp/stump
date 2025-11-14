import { useStumpVersion } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	cn,
	Heading,
	Label,
	Link,
	Text,
	TEXT_VARIANTS,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import toUpper from 'lodash/toUpper'
import { Info } from 'lucide-react'
import { useMemo } from 'react'

const REPO_URL = 'https://github.com/stumpapp/stump'
const IS_DEV = import.meta.env.DEV

export default function ServerInfoSection() {
	const version = useStumpVersion()

	const { t } = useLocaleContext()

	const versionUrl = useMemo(
		() => (version?.semver ? `${REPO_URL}/releases/tag/v${version.semver}` : REPO_URL),
		[version],
	)

	const commitUrl = useMemo(
		() => (version?.rev ? `${REPO_URL}/commit/${version.rev}` : undefined),
		[version],
	)

	const buildChannel = useMemo(
		() => version?.buildChannel ?? (IS_DEV ? 'local' : undefined),
		[version],
	)

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/general.sections.serverInfo.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/general.sections.serverInfo.description')}
				</Text>
			</div>

			{buildChannel && buildChannel !== 'stable' && (
				<Alert variant="info">
					<Info className="h-4 w-4" />
					<AlertTitle>
						{t('settingsScene.server/general.sections.serverInfo.nonStableChannel.title')}
					</AlertTitle>
					<AlertDescription className="flex">
						{t('settingsScene.server/general.sections.serverInfo.nonStableChannel.description.0')}{' '}
						<span className="font-semibold">
							{toUpper(buildChannel.charAt(0)) + buildChannel.slice(1)}
						</span>{' '}
						{t('settingsScene.server/general.sections.serverInfo.nonStableChannel.description.1')}
					</AlertDescription>
				</Alert>
			)}

			{version && (
				<div className="flex flex-col gap-8 md:flex-row">
					<div>
						<Label>Semantic version</Label>
						<Link
							href={versionUrl}
							target="__blank"
							rel="noopener noreferrer"
							className={cn(
								'flex items-center space-x-2 text-sm hover:underline',
								TEXT_VARIANTS.muted,
							)}
							underline={false}
						>
							<span>v{version.semver}</span>
						</Link>
					</div>

					{buildChannel && (
						<div>
							<Label>Build channel</Label>
							<Text size="sm" variant="muted">
								{toUpper(buildChannel.charAt(0)) + buildChannel.slice(1)}
							</Text>
						</div>
					)}

					<div>
						<Label>Exact commit</Label>
						<Link
							href={commitUrl}
							target="__blank"
							rel="noopener noreferrer"
							className={cn(
								'flex items-center space-x-2 text-sm hover:underline',
								TEXT_VARIANTS.muted,
							)}
							underline={false}
						>
							<span>{version.rev}</span>
						</Link>
					</div>
					<div>
						<Label>Build date</Label>
						<Text size="sm" variant="muted">
							{dayjs(version.compileTime).format('LLL')}
						</Text>
					</div>
				</div>
			)}
		</div>
	)
}
