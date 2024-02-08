import { getMediaPage, getMediaThumbnail, mediaApi } from '@stump/api'
import { Button, Dialog, EntityCard } from '@stump/components'
import { Media } from '@stump/types'
import React, { useState } from 'react'
import toast from 'react-hot-toast'

import EditThumbnailDropdown from '@/components/thumbnail/EditThumbnailDropdown'

import BookPageGrid from './BookPageGrid'

type Props = {
	book: Media
}
// TODO: this looks doody, but it's a start
export default function BookThumbnailSelector({ book }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const [page, setPage] = useState<number>()

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
			await mediaApi.uploadMediaThumbnail(book.id, file)
			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to upload image')
		}
	}

	const handleConfirm = async () => {
		if (!page) return

		try {
			await mediaApi.patchMediaThumbnail(book.id, { page })

			// TODO: The browser is caching the image, so we need to force remove it and ensure
			// the new one is loaded instead

			setIsOpen(false)
		} catch (error) {
			console.error(error)
			toast.error('Failed to update thumbnail')
		}
	}

	return (
		<div className="relative">
			<EntityCard
				imageUrl={page ? getMediaPage(book.id, page) : getMediaThumbnail(book.id)}
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
							Choose a page from this book to use as the new thumbnail
						</Dialog.Description>
						<Dialog.Close onClick={() => setIsOpen(false)} />
					</Dialog.Header>

					<BookPageGrid
						bookId={book.id}
						pages={book.pages}
						selectedPage={page}
						onSelectPage={setPage}
					/>

					<Dialog.Footer>
						<Button variant="default" onClick={handleCancel}>
							Cancel
						</Button>
						<Button variant="primary" onClick={handleConfirm} disabled={!page}>
							Confirm selection
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog>
		</div>
	)
}
