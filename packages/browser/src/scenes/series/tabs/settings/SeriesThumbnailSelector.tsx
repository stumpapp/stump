import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Dialog, PickSelect } from '@stump/components'
import {
	FragmentType,
	graphql,
	SeriesThumbnailSelectorUpdateMutation,
	useFragment,
} from '@stump/graphql'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EntityCard } from '@/components/entity'
import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'

import BookPageGrid from '../../../book/settings/BookPageGrid'
import SeriesBookGrid, { SelectedBook } from './SeriesBookGrid'

export const SeriesThumbnailSelectorFragment = graphql(`
	fragment SeriesThumbnailSelector on Series {
		id
		thumbnail {
			url
		}
	}
`)

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

type OnSuccessData = PickSelect<SeriesThumbnailSelectorUpdateMutation, 'updateSeriesThumbnail'>

type Props = {
	fragment: FragmentType<typeof SeriesThumbnailSelectorFragment>
}

// TODO: This entire UI looks like absolute shit IMO. I find the management pages that
// aren't quite large enough to have their own sidebar navigation to be a bit awkward
// to think through. That said, I would REALLY like to land on something that doesn't
// make me cringe when looking at it

export default function SeriesThumbnailSelector({ fragment }: Props) {
	const series = useFragment(SeriesThumbnailSelectorFragment, fragment)

	const { sdk } = useSDK()
	const [selectedBook, setSelectedBook] = useState<SelectedBook>()
	const [page, setPage] = useState<number>()
	const [isOpen, setIsOpen] = useState(false)

	const onSuccess = useCallback(
		({ thumbnail: { url } }: OnSuccessData) =>
			sdk.axios.get(url, {
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
			onSuccess: (data) => onSuccess(data.updateSeriesThumbnail),
		},
	)

	const { mutateAsync: uploadThumbnail, isPending: isUploadingThumbnail } = useGraphQLMutation(
		uploadMutation,
		{
			onSuccess: (data) => onSuccess(data.uploadSeriesThumbnail),
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
				await uploadThumbnail({ file, id: series.id })
				setIsOpen(false)
			} catch (error) {
				console.error(error)
				toast.error('Failed to upload image')
			}
		},
		[series.id, uploadThumbnail],
	)

	const handleConfirm = useCallback(async () => {
		if (!selectedBook || page == null) return

		try {
			await patchThumbnail({ id: series.id, input: { mediaId: selectedBook.id, page } })
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to update thumbnail')
		}
	}, [patchThumbnail, page, selectedBook, series.id])

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
		} else {
			return <SeriesBookGrid seriesId={series.id} onSelectBook={setSelectedBook} />
		}
	}

	useEffect(() => {
		return () => {
			setSelectedBook(undefined)
			setPage(undefined)
		}
	}, [isOpen])

	return (
		<div className="relative">
			<EntityCard
				imageUrl={
					selectedBook && page ? sdk.media.bookPageURL(selectedBook.id, page) : series.thumbnail.url
				}
				isCover
				className="flex-auto flex-shrink-0"
				fullWidth={(imageFailed) => !imageFailed}
			/>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Trigger asChild>
					<span className="absolute bottom-2 left-2 block">
						<EditThumbnailDropdown
							onChooseSelector={() => setIsOpen(true)}
							onUploadImage={handleUploadImage}
						/>
					</span>
				</Dialog.Trigger>
				<Dialog.Content size="xl">
					<Dialog.Header>
						<Dialog.Title>Select a thumbnail</Dialog.Title>
						<Dialog.Description>
							{selectedBook
								? 'Choose a page from this book to use as the new thumbnail'
								: 'Select a book from the series'}

							{selectedBook && (
								<span
									className="ml-2 cursor-pointer underline"
									onClick={() => {
										setSelectedBook(undefined)
										setPage(undefined)
									}}
								>
									Go back
								</span>
							)}
						</Dialog.Description>
						<Dialog.Close onClick={() => setIsOpen(false)} />
					</Dialog.Header>

					{renderContent()}

					<Dialog.Footer>
						<Button variant="default" onClick={handleCancel}>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleConfirm}
							disabled={!selectedBook || !page}
							isLoading={isPatchingThumbnail || isUploadingThumbnail}
						>
							Confirm selection
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
