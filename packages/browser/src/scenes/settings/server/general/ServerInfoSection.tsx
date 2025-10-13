import { useStumpVersion } from '@stump/client'
import { cn, Heading, Label, Link, Text, TEXT_VARIANTS } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import { useMemo } from 'react'

const REPO_URL = 'https://github.com/stumpapp/stump'

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

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/general.sections.serverInfo.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/general.sections.serverInfo.description')}
				</Text>
			</div>

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
