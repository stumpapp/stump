import { Badge, Link, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'

import { usePaths } from '../../paths'

const fragment = graphql(`
	fragment BookLibrarySeriesLinks on Media {
		library {
			id
			name
		}
		series {
			id
			resolvedName
		}
	}
`)

type Props = {
	fragment: FragmentType<typeof fragment>
}

export default function BookLibrarySeriesLinks({ fragment: fragmentRef }: Props) {
	const paths = usePaths()
	const { library, series } = useFragment(fragment, fragmentRef)

	return (
		<div className="gap-1.5 flex items-center">
			<Link
				to={series ? paths.librarySeries(library.id) : paths.libraryBooks(library.id)}
				underline={false}
				className="rounded-full focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Badge size="sm" rounded="full" className="cursor-pointer">
					{library.name}
				</Badge>
			</Link>
			{series && (
				<>
					<Text size="sm" variant="muted">
						/
					</Text>
					<Link
						to={paths.seriesOverview(series.id)}
						underline={false}
						className="rounded-full focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Badge variant="primary" size="sm" rounded="full" className="cursor-pointer">
							{series.resolvedName}
						</Badge>
					</Link>
				</>
			)}
		</div>
	)
}
