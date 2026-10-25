import { useGraphQLMutation } from '@stump/client'
import { Button, Dialog, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'
import { useTranslate } from '@/hooks/useTranslate'
import BookPageGrid from '@/scenes/book/settings/BookPageGrid'
import { useLibraryContext } from '@/scenes/library/context'
import SeriesBookGrid, { SelectedBook } from '@/scenes/series/tabs/settings/SeriesBookGrid'
import { invalidateThumbnailQueries } from '@/utils/query'

import LibrarySeriesGrid, { SelectedSeries } from '../../LibrarySeriesGrid'

// TODO: Redesign this ugly shit

const LOCALE_KEY = 'librarySettingsScene.options/thumbnails.sections.management.selectThumbnail'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

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

	const [isOpen, setIsOpen] = useState(false)

	const { library } = useLibraryContext()
	const { t, translate } = useTranslate()

	const onSuccess = useCallback(() => invalidateThumbnailQueries(queryClient), [queryClient])

	const { mutateAsync: patchThumbnail, isPending: isPatchingThumbnail } = useGraphQLMutation(
		updateMutation,
		{ onSuccess },
	)

	const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useGraphQLMutation(
		uploadMutation,
		{ onSuccess },
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
				toast.error(t('thumbnailSelector.errors.uploadFailed'))
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
			toast.error(t('thumbnailSelector.errors.updateFailed'))
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
			return t('thumbnailSelector.descriptions.chooseBookPage')
		} else if (selectedSeries) {
			return t('thumbnailSelector.descriptions.chooseSeriesBook')
		} else {
			return t(getKey('librarySeriesDescription'))
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
				{translate('shared.common.goBack')}
			</span>
		)
	}

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Label>{t('common.selectAThumbnail')}</Label>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
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
						<Dialog.Title>{t('thumbnailSelector.title')}</Dialog.Title>
						<Dialog.Description>
							{renderDescription()}
							{renderGoBack()}
						</Dialog.Description>
						<Dialog.Close onClick={() => setIsOpen(false)} />
					</Dialog.Header>

					<Suspense>{renderContent()}</Suspense>
					<Dialog.Footer>
						<Button variant="outline" onClick={handleCancel}>
							{translate('shared.common.cancel')}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={!selectedSeries || !selectedBook || !page}
							isLoading={isPatchingThumbnail || isUploadingThumbnail}
						>
							{t('thumbnailSelector.actions.confirmSelection')}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
