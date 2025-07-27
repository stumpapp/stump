import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, Breadcrumbs, Button, Heading, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import paths from '@/paths'

import BookThumbnailSelector from './BookThumbnailSelector'

const query = graphql(`
	query BookManagementScene($id: ID!) {
		mediaById(id: $id) {
			id
			resolvedName
			library {
				id
				name
			}
			series {
				id
				resolvedName
			}
			...BookThumbnailSelector
		}
	}
`)

export default function BookManagementScene() {
	const navigate = useNavigate()

	const { sdk } = useSDK()
	const { id } = useParams()

	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, sdk.cacheKey('mediaById', [id]), {
		id: id ?? '',
	})

	const breadcrumbs = useMemo(() => {
		if (!book) return []

		const { series, library } = book

		return [
			{ label: library.name, to: paths.librarySeries(library.id) },
			{
				label: series.resolvedName,
				to: paths.seriesOverview(series.id),
			},
			{
				label: book.resolvedName,
				to: paths.bookOverview(book.id),
			},
		]
	}, [book])

	// TODO(graphql): Re-add analyze button with mutation
	const handleAnalyze = () => {
		if (id != undefined) {
			// sdk.media.analyze(id)
		}
	}

	useEffect(() => {
		if (!book) {
			navigate(paths.notFound())
		}
	}, [book, navigate])

	if (!book) {
		return null
	}

	return (
		<SceneContainer>
			<div className="flex flex-col items-start gap-y-6 text-left">
				<div className="flex flex-col gap-y-1.5">
					<Breadcrumbs segments={breadcrumbs} trailingSlash />
					<Heading size="lg" className="font-bold">
						Manage
					</Heading>

					<Text size="sm" variant="muted">
						Make changes to this book
					</Text>
				</div>

				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Book management is currently under development and has very limited functionality
					</Alert.Content>
				</Alert>

				<div>
					<Button size="md" variant="primary" onClick={handleAnalyze}>
						Analyze Media
					</Button>
				</div>

				<BookThumbnailSelector fragment={book} />
			</div>
		</SceneContainer>
	)
}
