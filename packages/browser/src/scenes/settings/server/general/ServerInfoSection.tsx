import { useStumpVersion } from '@stump/client'
import { cn, Heading, Label, Link, Text, TEXT_VARIANTS } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'

export default function ServerInfoSection() {
	const version = useStumpVersion()

	const { t } = useLocaleContext()

	const commitUrl = useMemo(() => {
		if (!version) return undefined

		const { rev, semver } = version
		const repoUrl = 'https://github.com/stumpapp/stump'
		if (semver && semver !== '0.0.0') {
			return `${repoUrl}/releases/tag/v${semver}`
		} else if (rev) {
			return `${repoUrl}/commit/${rev}`
		} else {
			return repoUrl
		}
	}, [version])

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
						<Text size="sm" variant="muted">
							v{version.semver}
						</Text>
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
							{dayjs(version.compile_time).format('LLL')}
						</Text>
					</div>
				</div>
			)}
		</div>
	)
}
