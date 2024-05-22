import { useLibraries } from '@stump/client'

import { Container, ContentContainer } from '@/components/container'

import { useLibraryContext } from '../../context'
import DangerZone from './DangerZone'
import { CreateOrUpdateLibraryForm } from './form'
import LibraryExclusions from './LibraryExclusions'
import QuickActions from './QuickActions'

// TODO: redesign this page, it is ugly.

export default function LibrarySettingsScene() {
	const { library } = useLibraryContext()
	const { libraries } = useLibraries()

	return (
		<Container disableHorizontalPadding>
			<ContentContainer className="mt-0">
				{libraries && (
					<>
						<LibraryExclusions />
						<QuickActions />
						<CreateOrUpdateLibraryForm existingLibraries={libraries} library={library} />
						<DangerZone />
					</>
				)}
			</ContentContainer>
		</Container>
	)
}
