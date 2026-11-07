import { useGraphQLMutation, useGraphQLUploadMutation, useUploadConfig } from '@stump/client'
import { Button, Dialog, DropdownMenu, NewCard } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ImagePlus, ImageUp } from 'lucide-react'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'

import BookPageGrid from '@/components/book/BookPageGrid'
import { useLibraryContext } from '@/components/library/context'
import SeriesBookGrid, { SelectedBook } from '@/components/series/SeriesBookGrid'
import UploadImageModal from '@/components/thumbnail/UploadImageModal'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { invalidateThumbnailQueries } from '@/utils/query'

import LibrarySeriesGrid, { SelectedSeries } from '../../LibrarySeriesGrid'

const updateMutation = graphql(`
	mutation LibraryThumbnailSelectorUpdate($id: ID!, $input: UpdateThumbnailInput!) {
		updateLibraryThumbnail(id: $id, input: $input) {
			id
			thumbnail {
				url
			}
		}
	}
`)

const uploadMutation = graphql(`
	mutation LibraryThumbnailSelectorUpload($id: ID!, $file: Upload!) {
		uploadLibraryThumbnail(id: $id, file: $file) {
			id
			thumbnail {
				url
			}
		}
	}
`)

export default function LibraryThumbnailSelector() {
	const queryClient = useQueryClient()
	const [selectedSeries, setSelectedSeries] = useState<SelectedSeries>()
	const [selectedBook, setSelectedBook] = useState<SelectedBook>()
	const [page, setPage] = useState<number>()

	const [isSelectorOpen, setIsSelectorOpen] = useState(false)
	const [isUploadOpen, setIsUploadOpen] = useState(false)

	const { library } = useLibraryContext()
	const { checkPermission } = useAppContext()
	const { t, translate } = useTranslate()

	const hasUploadPermission = checkPermission(UserPermission.UploadFile)
	const { uploadConfig } = useUploadConfig({ enabled: hasUploadPermission })
	const canUpload = hasUploadPermission && !!uploadConfig?.enabled

	const onSuccess = () => invalidateThumbnailQueries(queryClient)

	const { mutateAsync: patchThumbnail, isPending: isPatching } = useGraphQLMutation(
		updateMutation,
		{ onSuccess },
	)
	const { mutateAsync: uploadThumbnail } = useGraphQLUploadMutation(uploadMutation, {
		onSuccess,
	})

	const closeSelector = () => {
		setSelectedSeries(undefined)
		setSelectedBook(undefined)
		setPage(undefined)
		setIsSelectorOpen(false)
	}

	const handleUploadImage = async (file: File) => {
		try {
			await uploadThumbnail({ id: library.id, file })
			setIsUploadOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.uploadFailed'))
		}
	}

	const handleConfirm = async () => {
		if (!selectedBook || page == null) return
		try {
			await patchThumbnail({ id: library.id, input: { mediaId: selectedBook.id, page } })
			closeSelector()
		} catch (error) {
			console.error(error)
			toast.error(t('thumbnailSelector.errors.updateFailed'))
		}
	}

	const goBack = () => {
		setPage(undefined)
		if (selectedBook) {
			setSelectedBook(undefined)
		} else {
			setSelectedSeries(undefined)
		}
	}

	const description = selectedBook
		? t('thumbnailSelector.descriptions.chooseBookPage')
		: selectedSeries
			? t('thumbnailSelector.descriptions.chooseSeriesBook')
			: t('thumbnailSelector.descriptions.chooseLibrarySeries')

	return (
		<NewCard.Row
			className="gap-4 flex flex-col"
			label={t('thumbnailManagement.changeThumbnail.label')}
			description={t('thumbnailManagement.changeThumbnail.descriptionLibrary')}
		>
			<div>
				<DropdownMenu
					align="start"
					trigger={
						<Button className="border border-border" variant="outline">
							{t('thumbnailSelector.label')}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: t('thumbnailSelector.chooseAPage'),
									leftIcon: <ImagePlus />,
									onClick: () => setIsSelectorOpen(true),
								},
								...(canUpload
									? [
											{
												label: t('thumbnailSelector.uploadImage'),
												leftIcon: <ImageUp />,
												onClick: () => setIsUploadOpen(true),
											},
										]
									: []),
							],
						},
					]}
				/>
			</div>

			<Dialog open={isSelectorOpen} onOpenChange={(open) => !open && closeSelector()}>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>{t('thumbnailSelector.title')}</Dialog.Title>
						<Dialog.Description>
							{description}
							{(selectedBook || selectedSeries) && (
								<button type="button" className="ml-2 underline" onClick={goBack}>
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
								extension={selectedBook.extension}
								selectedPage={page}
								onSelectPage={setPage}
							/>
						) : selectedSeries ? (
							<SeriesBookGrid seriesId={selectedSeries.id} onSelectBook={setSelectedBook} />
						) : (
							<LibrarySeriesGrid libraryId={library.id} onSelectSeries={setSelectedSeries} />
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

			{canUpload && (
				<UploadImageModal
					isOpen={isUploadOpen}
					onClose={() => setIsUploadOpen(false)}
					onUploadImage={handleUploadImage}
					maxSize={uploadConfig.maxFileUploadSize}
				/>
			)}
		</NewCard.Row>
	)
}
