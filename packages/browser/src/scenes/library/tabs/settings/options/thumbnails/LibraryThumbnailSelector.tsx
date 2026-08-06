import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Dialog, Label, PickSelect, Text } from '@stump/components'
import { graphql, LibraryThumbnailSelectorUpdateMutation } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'
import BookPageGrid from '@/scenes/book/settings/BookPageGrid'
import { useLibraryContext } from '@/scenes/library/context'
import SeriesBookGrid, { SelectedBook } from '@/scenes/series/tabs/settings/SeriesBookGrid'

import LibrarySeriesGrid, { SelectedSeries } from '../../LibrarySeriesGrid'

// TODO: Redesign this ugly shit

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

type OnSuccessData = PickSelect<LibraryThumbnailSelectorUpdateMutation, 'updateLibraryThumbnail'>

export default function LibraryThumbnailSelector() {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const [selectedSeries, setSelectedSeries] = useState<SelectedSeries>()
	const [selectedBook, setSelectedBook] = useState<SelectedBook>()
	const [page, setPage] = useState<number>()

	const [isOpen, setIsOpen] = useState(false)

	const { library } = useLibraryContext()

	const onSuccess = useCallback(
		({ thumbnail }: OnSuccessData) =>
			sdk.axios.get(thumbnail.url, {
				headers: {
					'Cache-Control': 'no-cache',
					Pragma: 'no-cache',
					Expires: '0',
				},
			}),
		[sdk],
	)

	const { mutateAsync: patchThumbnail, isPending: isPatchingThumbnail } = useGraphQLMutation(
		updateMutation,
		{
			onSuccess: (data) => onSuccess(data.updateLibraryThumbnail),
		},
	)

	const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useGraphQLMutation(
		uploadMutation,
		{
			onSuccess: (data) => onSuccess(data.uploadLibraryThumbnail),
		},
	)

	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen) {
			setIsOpen(false)
		}
	}

	const handleCancel = () => {
		if (page) {
			setPage(undefined)
		}
		setIsOpen(false)
	}

	const handleUploadImage = useCallback(
		async (file: File) => {
			try {
				await uploadThumbnail({ id: library.id, file })
				setIsOpen(false)
			} catch (error) {
				console.error(error)
				toast.error(t('common.failedToUploadImage'))
			}
		},
		[library.id, uploadThumbnail, t],
	)

	const handleConfirm = useCallback(async () => {
		if (!selectedBook || !page) return

		try {
			await patchThumbnail({ id: library.id, input: { mediaId: selectedBook.id, page } })
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error(t('common.failedToUpdateThumbnail'))
		}
	}, [patchThumbnail, selectedBook, page, library.id, t])

	useEffect(() => {
		return () => {
			setSelectedSeries(undefined)
			setSelectedBook(undefined)
			setPage(undefined)
		}
	}, [isOpen])

	const renderContent = () => {
		if (selectedBook) {
			return (
				<BookPageGrid
					bookId={selectedBook.id}
					pages={selectedBook.pages}
					selectedPage={page}
					onSelectPage={setPage}
				/>
			)
		} else if (selectedSeries) {
			return <SeriesBookGrid seriesId={selectedSeries.id} onSelectBook={setSelectedBook} />
		} else {
			return <LibrarySeriesGrid libraryId={library.id} onSelectSeries={setSelectedSeries} />
		}
	}

	const renderDescription = () => {
		if (selectedBook) {
			return t('common.choosePageForThumbnail')
		} else if (selectedSeries) {
			return t('common.selectBookFromSeries')
		} else {
			return t('common.selectSeriesFromLibrary')
		}
	}

	const renderGoBack = () => {
		if (!selectedBook && !selectedSeries) return null

		return (
			<span
				className="ml-2 cursor-pointer underline"
				onClick={() => {
					setPage(undefined)
					if (selectedBook) {
						setSelectedBook(undefined)
					} else if (selectedSeries) {
						setSelectedSeries(undefined)
					}
				}}
			>
				{t('common.goBack')}
			</span>
		)
	}

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Label>{t('common.selectThumbnail')}</Label>
				<Text size="sm" variant="muted">
					{t('common.libraryThumbnailDescription')}
				</Text>
			</div>

			<div>
				<EditThumbnailDropdown
					onChooseSelector={() => setIsOpen(true)}
					onUploadImage={handleUploadImage}
				/>
			</div>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>{t('common.selectThumbnail')}</Dialog.Title>
						<Dialog.Description>
							{renderDescription()}
							{renderGoBack()}
						</Dialog.Description>
						<Dialog.Close onClick={() => setIsOpen(false)} />
					</Dialog.Header>

					<Suspense>{renderContent()}</Suspense>
					<Dialog.Footer>
						<Button variant="outline" onClick={handleCancel}>
							{t('common.cancel')}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={!selectedSeries || !selectedBook || !page}
							isLoading={isPatchingThumbnail || isUploadingThumbnail}
						>
							{t('common.confirmSelection')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
