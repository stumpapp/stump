import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import { ContentContainer, SceneContainer } from '@/components/container'

import CreateTagModal from './CreateTagModal'
import TagTable from './TagTable'

export default function TagSettingsScene() {
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

						<CreateTagModal />
					</div>

					<Suspense>
						<TagTable />
					</Suspense>
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}

const LOCALE_BASE = 'settingsScene.server/tags.sections.table'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
