import { useLibraries } from '@stump/client'

import { ImageGrid } from '~/components/grid'
import { LibraryGridItem } from '~/components/library'
import { Heading, icons, Text } from '~/components/ui'

const { CircleEllipsis } = icons

export default function Screen() {
	const { libraries, refetch, isRefetching } = useLibraries({ suspense: true })

	return (
		<ImageGrid
			largeHeader={<Heading size="xl">Libraries</Heading>}
			header={{
				headerCenter: (
					<Text size="lg" className="tracking-wide text-foreground">
						Libraries
					</Text>
				),
				headerRight: <CircleEllipsis className="h-6 w-6 text-foreground" />,
				headerRightFadesIn: true,
			}}
			data={libraries || []}
			renderItem={({ item: library, index }) => <LibraryGridItem library={library} index={index} />}
			keyExtractor={(library) => library.id}
			onRefresh={refetch}
			isRefetching={isRefetching}
		/>
	)
}
