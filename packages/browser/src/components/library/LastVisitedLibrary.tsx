import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'

import paths from '@/paths'

import { EntityCard } from '../entity'

const query = graphql(`
	query LastVisitedLibrary {
		lastVisitedLibrary {
			id
			name
			thumbnail {
				url
			}
		}
	}
`)

type Props = {
	container?: (children: React.ReactNode) => React.ReactNode
}

export default function LastVisitedLibrary({ container }: Props) {
	const { sdk } = useSDK()
	const {
		data: { lastVisitedLibrary: library },
	} = useSuspenseGraphQL(query, sdk.cacheKey('lastVisitedLibrary'))

	if (!library) {
		return null
	}

	const renderContent = () => {
		return (
			<div className="flex flex-col gap-y-2">
				<Label className="text-sm">Last visited</Label>
				<EntityCard
					href={paths.librarySeries(library.id)}
					imageUrl={library.thumbnail.url}
					isCover
					className="flex-auto flex-shrink-0"
					fullWidth={(imageFailed) => !imageFailed}
				/>

				<Text className="line-clamp-1 text-sm" variant="muted">
					{library.name}
				</Text>
			</div>
		)
	}

	if (container) {
		return container(renderContent())
	}

	return renderContent()
}
