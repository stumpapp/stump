import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { Button } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { Suspense, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useNavigate, useParams } from 'react-router'

import { BookHeader } from '@/components/book/BookHeader'
import { MediaMetadataEditor } from '@/components/book/metadata'
import { SceneContainer } from '@/components/container'
import { MatchReviewDialog } from '@/components/metadata/metadataMatching'
import { SettingsSection } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import BookMetadataSearch from './BookMetadataSearch'
import BookTagEditor from './BookTagEditor'

const query = graphql(`
	query BookSettingsScene($id: ID!) {
		mediaById(id: $id) {
			id
			resolvedName
			...BookHeader
			tags {
				id
				name
			}
			metadata {
				...MediaMetadataEditor
			}
		}
	}
`)

export default function BookSettingsScene() {
	const paths = usePaths()
	const navigate = useNavigate()
	const { t } = useTranslate()

	const { checkPermission } = useAppContext()

	const { sdk } = useSDK()
	const { id } = useParams()

	const {
		data: { mediaById: book },
	} = useSuspenseGraphQL(query, sdk.cacheKey('mediaById', [id]), {
		id: id ?? '',
	})

	const [isSearchingMetadata, setIsSearchingMetadata] = useState(false)

	useEffect(() => {
		if (!book) {
			navigate(paths.notFound())
		}
	}, [book, navigate, paths])

	if (!book) {
		return null
	}

	return (
		<>
			<Helmet>
				<title>Stump | {book.resolvedName}</title>
			</Helmet>

			<BookHeader fragment={book} />

			<SceneContainer variant="settings" className="max-w-[unset]">
				{checkPermission(UserPermission.EditMetadata) && (
					<Suspense>
						<BookTagEditor mediaId={book.id} tags={book.tags} />
					</Suspense>
				)}

				{(checkPermission(UserPermission.EditMetadata) ||
					checkPermission(UserPermission.MetadataFetchRecordManage)) && (
					<SettingsSection
						title="Metadata"
						description="Extra information about this book"
						actions={
							checkPermission(UserPermission.MetadataFetchRecordManage) && (
								<Button variant="outline" size="sm" onClick={() => setIsSearchingMetadata(true)}>
									{t(getKey('openButton'))}
								</Button>
							)
						}
					>
						{checkPermission(UserPermission.MetadataFetchRecordManage) && (
							<>
								<BookMetadataSearch
									mediaId={book.id}
									initialTitle={book.resolvedName}
									isOpen={isSearchingMetadata}
									onClose={() => setIsSearchingMetadata(false)}
								/>
								<MatchReviewDialog />
							</>
						)}
						{checkPermission(UserPermission.EditMetadata) && (
							<MediaMetadataEditor mediaId={book.id} data={book.metadata} />
						)}
					</SettingsSection>
				)}
			</SceneContainer>
		</>
	)
}

const LOCALE_KEY = 'bookManagementScene.metadataSearch'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
