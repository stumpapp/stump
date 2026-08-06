import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, Breadcrumbs, Button, Heading, Text } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Construction } from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import { MatchReviewDialog } from '@/components/metadata/metadataMatching'
import { useAppContext } from '@/context'
import paths from '@/paths'

import BookMetadataSearch from './BookMetadataSearch'
import BookTagEditor from './BookTagEditor'
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
			tags {
				id
				name
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
	const { t } = useLocaleContext()

	const { checkPermission } = useAppContext()

	const { sdk } = useSDK()
	const { id } = useParams()

	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, sdk.cacheKey('mediaById', [id]), {
		id: id ?? '',
	})

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)

	const [isSearchingMetadata, setIsSearchingMetadata] = useState(false)

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
			<div className="gap-y-6 flex flex-col items-start text-left">
				<div className="gap-y-1.5 flex flex-col">
					<Breadcrumbs segments={breadcrumbs} trailingSlash />
					<Heading size="lg" className="font-bold">
						{t('bookManagementScene.heading')}
					</Heading>

					<Text size="sm" variant="muted">
						{t('bookManagementScene.description')}
					</Text>
				</div>

				<Alert variant="warning">
					<Construction />
					<AlertDescription>{t('bookManagementScene.developmentNotice')}</AlertDescription>
				</Alert>

				{checkPermission(UserPermission.ManageLibrary) && (
					<div className="gap-y-2 flex flex-col">
						<div>
							<Heading size="sm">{t('bookManagementScene.analysis.heading')}</Heading>
							<Text size="sm" variant="muted">
								{t('bookManagementScene.analysis.description')}
							</Text>
						</div>

						<div>
							<Button
								title={
									data
										? t('bookManagementScene.analysis.inProgress')
										: t('bookManagementScene.analysis.actionTitle')
								}
								size="default"
								onClick={handleAnalyze}
								disabled={!!data || isPending}
							>
								{t('bookManagementScene.analysis.action')}
							</Button>
						</div>
					</div>
				)}

				{checkPermission(UserPermission.MetadataFetchRecordManage) && (
					<div className="gap-y-2 flex flex-col">
						<div>
							<Heading size="sm">{t(getKey('heading'))}</Heading>
							<Text size="sm" variant="muted">
								{t(getKey('description'))}
							</Text>
						</div>

						<div>
							<Button size="default" onClick={() => setIsSearchingMetadata(true)}>
								{t(getKey('openButton'))}
							</Button>
						</div>

						<BookMetadataSearch
							mediaId={book.id}
							initialTitle={book.resolvedName}
							isOpen={isSearchingMetadata}
							onClose={() => setIsSearchingMetadata(false)}
						/>
						<MatchReviewDialog />
					</div>
				)}

				{checkPermission(UserPermission.EditMetadata) && (
					<Suspense>
						<BookTagEditor mediaId={book.id} tags={book.tags} />
					</Suspense>
				)}

				{checkPermission(UserPermission.EditThumbnails) && (
					<div className="gap-y-2 flex flex-col">
						<div>
							<Heading size="sm">{t('bookManagementScene.thumbnail.heading')}</Heading>
							<Text size="sm" variant="muted">
								{t('bookManagementScene.thumbnail.description')}
							</Text>
						</div>

						<BookThumbnailSelector fragment={book} />
					</div>
				)}
			</div>
		</SceneContainer>
	)
}

const LOCALE_KEY = 'bookManagementScene.metadataSearch'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
