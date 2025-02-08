import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import APIKeyTable from './APIKeyTable'
import CreateAPIKeyModal from './CreateAPIKeyModal'

export default function APIKeySettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<ContentContainer>
				<div className="flex flex-col gap-4">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">{t(getKey('title'))}</Heading>
							<Text size="sm" variant="muted" className="mt-1">
								{t(getKey('description'))}
							</Text>
						</div>

						<CreateAPIKeyModal />
					</div>

					<Suspense>
						<APIKeyTable />
					</Suspense>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.table'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
