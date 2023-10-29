import { getMediaThumbnail } from '@stump/api'
import { AspectRatio, Card, Heading, Input, Text } from '@stump/components'
import { Media } from '@stump/types'
import React, { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import BookSearchOverlay from '../../../../../../components/media/BookSearchOverlay'
import { defaultBook, Schema } from './CreateOrAddToScheduleForm'

type Props = {
	index: number
}
export default function AddBookCard({ index }: Props) {
	const [selectedBook, setSelectedBook] = useState<Media | null>(null)

	const form = useFormContext<Schema>()

	const bookOptions = form.watch(`books.${index}`) ?? defaultBook
	const isEntityBook = 'id' in bookOptions.book

	useEffect(() => {
		if (!isEntityBook && selectedBook) {
			setSelectedBook(null)
		}
	}, [isEntityBook, selectedBook])

	const handleSelectBook = (book: Media) => {
		form.setValue(`books.${index}.book.id`, book.id)
		setSelectedBook(book)
	}

	const renderBookInfo = () => {
		if (!selectedBook) return null

		const bookName = selectedBook.metadata?.title || selectedBook.name

		return (
			<div className="flex flex-col gap-1.5">
				<div className="w-[125px]">
					<AspectRatio ratio={2 / 3}>
						<img src={getMediaThumbnail(selectedBook.id)} className="rounded-md object-cover" />
					</AspectRatio>
				</div>
				<Heading size="sm">{bookName}</Heading>
			</div>
		)
	}

	return (
		<Card className="flex w-full flex-col gap-4 p-4">
			<div>
				<Heading size="xs">Pick a book</Heading>
				<Text variant="muted" size="sm" className="mt-1">
					You can add a book from your library
				</Text>
			</div>

			<div className="flex justify-between md:justify-normal">
				{renderBookInfo()}
				<BookSearchOverlay onBookSelect={handleSelectBook} />
			</div>

			<div className="relative">
				<div className="absolute inset-0 flex items-center" aria-hidden="true">
					<div className="w-full border-t border-gray-75 dark:border-gray-800" />
				</div>
				<div className="relative flex justify-start">
					<span className="bg-white pr-2 text-sm text-gray-400 dark:bg-gray-975 dark:text-gray-600">
						OR
					</span>
				</div>
			</div>

			<div>
				<Heading size="xs">Add an external book</Heading>
				<Text variant="muted" size="sm" className="mt-1">
					If you want to add a book that isn&apos;t in your library, you can add information about
					it here
				</Text>
			</div>

			<div className="flex w-full flex-col items-start gap-x-4 gap-y-4 md:flex-row md:gap-y-0">
				<Input
					fullWidth
					variant="primary"
					label="Title"
					disabled={isEntityBook}
					{...form.register(`books.${index}.book.title`)}
				/>
				<Input
					variant="primary"
					label="Author"
					disabled={isEntityBook}
					{...form.register(`books.${index}.book.author`)}
				/>
			</div>

			<Input
				variant="primary"
				label="Book URL"
				disabled={isEntityBook}
				{...form.register(`books.${index}.book.url`)}
			/>
		</Card>
	)
}
