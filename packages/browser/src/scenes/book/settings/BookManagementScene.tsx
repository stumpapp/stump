import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, Breadcrumbs, Button, Heading, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
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

const analyzeMutation = graphql(`
	mutation BookManagementSceneAnalyze($id: ID!) {
		analyzeMedia(id: $id)
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

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)

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

	const handleAnalyze = useCallback(() => {
		if (id != null) {
			analyze({ id })
		}
	}, [analyze, id])

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

				<Alert variant="warning">
					<Construction />
					<AlertDescription>
						Book management is currently under development and has very limited functionality
					</AlertDescription>
				</Alert>

				<div>
					<Button
						title={data ? 'Analysis already in progress' : 'Analyze this book'}
						size="md"
						variant="primary"
						onClick={handleAnalyze}
						disabled={!!data || isPending}
					>
						Analyze Media
					</Button>
				</div>

				<BookThumbnailSelector fragment={book} />
			</div>
		</SceneContainer>
	)
}
