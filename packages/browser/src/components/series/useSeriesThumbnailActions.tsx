import { useGraphQLMutation, useGraphQLUploadMutation } from '@stump/client'
import { Button, Dialog } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'

import BookPageGrid from '@/components/book/BookPageGrid'
import UploadImageModal from '@/components/thumbnail/UploadImageModal'
import { useTranslate } from '@/hooks/useTranslate'
import { invalidateThumbnailQueries } from '@/utils/query'

import SeriesBookGrid, { SelectedBook } from './SeriesBookGrid'

const updateMutation = graphql(`
	mutation SeriesThumbnailSelectorUpdate($id: ID!, $input: UpdateThumbnailInput!) {
		updateSeriesThumbnail(id: $id, input: $input) {
			id
			thumbnail {
				url
			}
		}
	}
`)

const uploadMutation = graphql(`
	mutation SeriesThumbnailSelectorUpload($id: ID!, $file: Upload!) {
		uploadSeriesThumbnail(id: $id, file: $file) {
			id
			thumbnail {
				url
			}
		}
	}
`)

/**
 * The state, mutations, and dialogs for changing a series' thumbnail
 */
export function useSeriesThumbnailActions(seriesId: string) {
	const { t, translate } = useTranslate()
	const queryClient = useQueryClient()

	const [isSelectorOpen, setIsSelectorOpen] = useState(false)
	const [isUploadOpen, setIsUploadOpen] = useState(false)
	const [selectedBook, setSelectedBook] = useState<SelectedBook>()
	const [page, setPage] = useState<number>()

	const onSuccess = () => invalidateThumbnailQueries(queryClient)

	const { mutateAsync: patchThumbnail, isPending: isPatching } = useGraphQLMutation(
		updateMutation,
		{ onSuccess },
	)
	const { mutateAsync: uploadThumbnail } = useGraphQLUploadMutation(uploadMutation, {
		onSuccess,
	})

	const closeSelector = () => {
		setSelectedBook(undefined)
		setPage(undefined)
		setIsSelectorOpen(false)
	}

	const handleUploadImage = async (file: File) => {
		try {
			await uploadThumbnail({ id: seriesId, file })
			setIsUploadOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.uploadFailed'))
		}
	}

	const handleConfirm = async () => {
		if (!selectedBook || page == null) return
		try {
			await patchThumbnail({ id: seriesId, input: { mediaId: selectedBook.id, page } })
			closeSelector()
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.updateFailed'))
		}
	}

	const dialogs = (
		<>
			<Dialog open={isSelectorOpen} onOpenChange={(open) => !open && closeSelector()}>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>{t('thumbnailSelector.title')}</Dialog.Title>
						<Dialog.Description>
							{selectedBook
								? t('thumbnailSelector.descriptions.chooseBookPage')
								: t('thumbnailSelector.descriptions.chooseSeriesBook')}

							{selectedBook && (
								<button
									type="button"
									className="ml-2 underline"
									onClick={() => {
										setSelectedBook(undefined)
										setPage(undefined)
									}}
								>
									{translate('shared.common.goBack')}
								</button>
							)}
						</Dialog.Description>
						<Dialog.Close onClick={closeSelector} />
					</Dialog.Header>

					<Suspense>
						{selectedBook ? (
							<BookPageGrid
								bookId={selectedBook.id}
								pages={selectedBook.pages}
								selectedPage={page}
								onSelectPage={setPage}
							/>
						) : (
							<SeriesBookGrid seriesId={seriesId} onSelectBook={setSelectedBook} />
						)}
					</Suspense>

					<Dialog.Footer>
						<Button variant="outline" onClick={closeSelector}>
							{translate('shared.common.cancel')}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={!selectedBook || !page}
							isLoading={isPatching}
						>
							{t('thumbnailSelector.actions.confirmSelection')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>

			<UploadImageModal
				isOpen={isUploadOpen}
				onClose={() => setIsUploadOpen(false)}
				onUploadImage={handleUploadImage}
			/>
		</>
	)

	return {
		openSelector: () => setIsSelectorOpen(true),
		openUpload: () => setIsUploadOpen(true),
		dialogs,
	}
}
