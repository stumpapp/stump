import { FragmentType, graphql, useFragment } from '@stump/graphql'

import { useActiveServer } from '../activeServer'
import GridImageItem from '../grid/GridImageItem'

const fragment = graphql(`
	fragment LibraryGridItem on Library {
		id
		name
		thumbnail {
			url
		}
	}
`)

export type ILibraryGridItemFragment = FragmentType<typeof fragment>

type Props = {
	library: ILibraryGridItemFragment
}

export default function LibraryGridItem({ library }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const data = useFragment(fragment, library)

	return (
		<GridImageItem
			uri={data.thumbnail.url}
			title={data.name}
			href={`/server/${serverID}/libraries/${data.id}`}
		/>
	)
}
