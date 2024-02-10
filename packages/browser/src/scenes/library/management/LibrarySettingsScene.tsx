import { useLibraries } from '@stump/client'

import { Container, ContentContainer } from '@/components/container'

import { useLibraryContext } from '../context'
import { CreateOrUpdateLibraryForm } from './form'
import LibraryExclusions from './LibraryExclusions'
import QuickActions from './QuickActions'

export default function LibrarySettingsScene() {
	const { library } = useLibraryContext()
	const { libraries } = useLibraries()

	return (
		<Container disableHorizontalPadding>
			{/* <div>
				<Heading size="lg">{t('librarySettingsScene.heading')}</Heading>
				<Text size="sm" variant="muted">
					{t('librarySettingsScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/libraries">
						{t('librarySettingsScene.subtitleLink')}.
					</Link>
				</Text>
			</div> */}

			<ContentContainer className="mt-0">
				{libraries && (
					<>
						<QuickActions />
						<LibraryExclusions />
						<CreateOrUpdateLibraryForm existingLibraries={libraries} library={library} />
					</>
				)}
			</ContentContainer>
		</Container>
	)
}
