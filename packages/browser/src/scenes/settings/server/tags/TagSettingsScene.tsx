import { Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import CreateTagModal from './CreateTagModal'
import TagTable from './TagTable'

// TODO(ui): remove dupe header, figure out better presentation with new layout

export default function TagSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
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
		</SceneContainer>
	)
}

const LOCALE_BASE = 'settingsScene.server/tags.sections.table'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
