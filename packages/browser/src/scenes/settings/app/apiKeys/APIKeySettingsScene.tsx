import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import APIKeyTable from './APIKeyTable'
import CreateAPIKeyModal from './CreateAPIKeyModal'

// TODO(management): expose UI for admins with permission for managing other users'
// keys to see and delete them. perhaps this is not necessary if you just lock the
// user account, but might be nice? i guess the todo is to consdier it lol

export default function APIKeySettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<ContentContainer>
				<div className="gap-4 flex flex-col">
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
