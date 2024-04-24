import { libraryApi } from '@stump/api'
import { Button, Dialog, Label, Text } from '@stump/components'
import { Media, Series } from '@stump/types'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'

import BookPageGrid from '../../../book/management/BookPageGrid'
import SeriesBookGrid from '../../../series/tabs/settings/SeriesBookGrid'
import { useLibraryContext } from '../../context'
import LibrarySeriesGrid from './LibrarySeriesGrid'

export default function LibraryThumbnailSelector() {
	const [selectedSeries, setSelectedSeries] = useState<Series>()
	const [selectedBook, setSelectedBook] = useState<Media>()
	const [page, setPage] = useState<number>()

	const [isOpen, setIsOpen] = useState(false)

	const { library } = useLibraryContext()

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

	const handleUploadImage = async (file: File) => {
		try {
			await libraryApi.uploadLibraryThumbnail(library.id, file)
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to upload image')
		}
	}

	const handleConfirm = async () => {
		if (!selectedBook || !page) return

		try {
			await libraryApi.patchLibraryThumbnail(library.id, {
				media_id: selectedBook.id,
				page,
			})
			// TODO: The browser is caching the image, so we need to force remove it and ensure
			// the new one is loaded instead
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to update thumbnail')
		}
	}

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
			return 'Choose a page from this book to use as the new thumbnail'
		} else if (selectedSeries) {
			return 'Select a book from the series'
		} else {
			return 'Select a series from the library'
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
				Go back
			</span>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Select thumbnail</Label>
				<Text size="sm" variant="muted">
					Choose a different thumbnail for this library, either from a book or upload a custom one
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
						<Dialog.Title>Select a thumbnail</Dialog.Title>
						<Dialog.Description>
							{renderDescription()}
							{renderGoBack()}
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
							disabled={!selectedSeries || !selectedBook || !page}
						>
							Confirm selection
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
