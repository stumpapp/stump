import { useStumpVersion } from '@stump/client'
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	cn,
	Link,
	NewCard,
	Text,
	TEXT_VARIANTS,
} from '@stump/components'
import { extractErrorMessage } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import toUpper from 'lodash/toUpper'
import { Copy, CopyCheck, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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

	const [didCopyDebugInfo, setDidCopyDebugInfo] = useState(false)

	async function onCopyDebugInfo() {
		const debugInfo = {
			server: {
				releaseChannel: buildChannel ?? 'Unknown',
				serverVersion: version?.semver ?? 'Unknown',
				commit: version?.rev ?? 'Unknown',
			},
			client: {
				device: navigator.userAgent,
				os: navigator.platform,
				browser: navigator.userAgent,
			},
		}

		const debugInfoString = `#### Server Details:
  - Release Channel: ${debugInfo.server.releaseChannel}
  - Server Version: ${debugInfo.server.serverVersion}
  - Commit: ${debugInfo.server.commit}

#### Client Details:
  - Device: ${debugInfo.client.device}
  - OS: ${debugInfo.client.os}
  - Browser: ${debugInfo.client.browser}`

		try {
			await navigator.clipboard.writeText(debugInfoString)
			setDidCopyDebugInfo(true)
		} catch (error) {
			toast.error(
				t('settingsScene.server/general.sections.serverInfo.debugInfo.copyDebugInfoFailed'),
				{
					description: extractErrorMessage(error, t('common.unknownError')),
				},
			)
			return
		}
	}

	useEffect(() => {
		if (!didCopyDebugInfo) return
		const timeout = setTimeout(() => setDidCopyDebugInfo(false), 2000)
		return () => clearTimeout(timeout)
	}, [didCopyDebugInfo])

	const CopyIcon = didCopyDebugInfo ? CopyCheck : Copy

	// TODO: a changelog query in a dialog would be nice to have
	return (
		<div className="gap-4 flex flex-col">
			<NewCard
				label={t('settingsScene.server/general.sections.serverInfo.title')}
				description={t('settingsScene.server/general.sections.serverInfo.description')}
			>
				<NewCard.Row label={t('settingsScene.server/general.sections.serverInfo.version')}>
					<Link
						href={versionUrl}
						target="__blank"
						rel="noopener noreferrer"
						className={cn(
							'space-x-2 text-sm flex items-center hover:underline',
							TEXT_VARIANTS.muted,
						)}
						underline={false}
					>
						<span>v{version?.semver}</span>
					</Link>
				</NewCard.Row>

				<NewCard.Row label={t('settingsScene.server/general.sections.serverInfo.build')}>
					<Text size="sm" variant="muted">
						{buildChannel
							? toUpper(buildChannel.charAt(0)) + buildChannel.slice(1)
							: t('common.unknown')}
					</Text>
				</NewCard.Row>

				<NewCard.Row label={t('settingsScene.server/general.sections.serverInfo.exactCommit')}>
					<Link
						href={commitUrl}
						target="__blank"
						rel="noopener noreferrer"
						className={cn(
							'space-x-2 text-sm flex items-center hover:underline',
							TEXT_VARIANTS.muted,
						)}
						underline={false}
					>
						<span>{version?.rev}</span>
						{version?.compileTime && (
							<span>
								(
								{intlFormat(new Date(version.compileTime), {
									month: 'long',
									day: 'numeric',
									year: 'numeric',
								})}
								)
							</span>
						)}
					</Link>
				</NewCard.Row>

				<NewCard.Row
					label={t('settingsScene.server/general.sections.serverInfo.debugInfo.label')}
					description={t('settingsScene.server/general.sections.serverInfo.debugInfo.description')}
				>
					<Button variant="outline" size="sm" onClick={onCopyDebugInfo} className="gap-x-2">
						<CopyIcon className="size-3" />
						{t('common.copy')}
					</Button>
				</NewCard.Row>
			</NewCard>

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
		</div>
	)
}
