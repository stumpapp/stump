import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { ContentContainer, SceneContainer } from '@/components/container'

import MetadataSourcesTable from './MetadataSourcesTable'

export default function MetadataSourceSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<ContentContainer>
				<div>
					<Heading size="sm">
						{t('settingsScene.server/metadata_sources.sections.availableSources.title')}
					</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/metadata_sources.sections.availableSources.description')}
					</Text>
				</div>
				<MetadataSourcesTable />
			</ContentContainer>
		</SceneContainer>
	)
}
