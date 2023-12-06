import { getMediaPage, getSeriesThumbnail, seriesApi } from '@stump/api'
import { Button, Dialog, EntityCard } from '@stump/components'
import { Media, Series } from '@stump/types'
import { Edit } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import BookPageGrid from '../../book/management/BookPageGrid'
import SeriesBookGrid from './SeriesBookGrid'

type Props = {
	series: Series
}
// TODO: this looks doody, but it's a start
export default function SeriesThumbnailSelector({ series }: Props) {
	const [selectedBook, setSelectedBook] = useState<Media>()
	const [page, setPage] = useState<number>()
	const [isOpen, setIsOpen] = useState(false)

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

	const handleConfirm = async () => {
		if (!selectedBook || !page) return

		try {
			await seriesApi.patchSeriesThumbnail(series.id, { media_id: selectedBook.id, page })
			// TODO: The browser is caching the image, so we need to force remove it and ensure
			// the new one is loaded instead
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to update thumbnail')
		}
	}

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
					selectedBook && page ? getMediaPage(selectedBook.id, page) : getSeriesThumbnail(series.id)
				}
				isCover
				className="flex-auto flex-shrink-0"
				fullWidth={(imageFailed) => !imageFailed}
			/>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<Dialog.Trigger asChild>
					<span className="absolute bottom-2 left-2 block">
						<Button
							variant="subtle-dark"
							size="xs"
							className="border border-gray-75 px-2 py-1.5 dark:border-gray-850"
							onClick={() => setIsOpen(true)}
						>
							<Edit className="mr-2 h-3 w-3" />
							Edit thumbnail
						</Button>
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
						<Button variant="primary" onClick={handleConfirm} disabled={!selectedBook || !page}>
							Confirm selection
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
