import { getMediaThumbnail } from '@stump/api'
import { AspectRatio, Button, Card, DatePicker, Heading, Input, Text } from '@stump/components'
import { Media } from '@stump/types'
import React, { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import BookSearchOverlay from '@/components/book/BookSearchOverlay'
import { formatBookName } from '@/utils/format'

import { defaultBook, Schema } from './CreateOrAddToScheduleForm'

type Props = {
	index: number
}
export default function AddBookCard({ index }: Props) {
	const [selectedBook, setSelectedBook] = useState<Media | null>(null)

	const form = useFormContext<Schema>()

	const bookOptions = form.watch(`books.${index}`) ?? defaultBook
	const isEntityBook = 'id' in bookOptions.book && !!bookOptions.book.id
	const isDefiningExternalBook = !isEntityBook && objectHasOneKeyWithLength(bookOptions.book)

	useEffect(
		() => {
			if (!selectedBook && isEntityBook) {
				form.setValue(`books.${index}.book.id`, '')
			} else if (selectedBook) {
				// TODO: this is annoying and not ideal
				form.setValue(`books.${index}.book.title`, '')
				form.setValue(`books.${index}.book.author`, '')
				form.setValue(`books.${index}.book.url`, undefined)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isEntityBook, selectedBook],
	)

	const handleSelectBook = (book: Media) => {
		form.setValue(`books.${index}.book.id`, book.id)
		setSelectedBook(book)
	}

	const renderBookInfo = () => {
		if (!selectedBook) return null

		const bookName = formatBookName(selectedBook)

		return (
			<div className="flex">
				<div className="max-h-[195px] w-[125px]">
					<AspectRatio ratio={2 / 3}>
						<img src={getMediaThumbnail(selectedBook.id)} className="rounded-md object-cover" />
					</AspectRatio>
				</div>
				<div className="ml-4 flex flex-col gap-1.5">
					<Heading size="sm" className="text-sm md:text-lg">
						{bookName}
					</Heading>
					<div>
						<Button variant="danger" onClick={() => setSelectedBook(null)} className="shrink-0">
							Remove selection
						</Button>
					</div>
				</div>
			</div>
		)
	}

	const renderSelectedBookOptions = () => {
		if (selectedBook) {
			return null
		} else {
			return <BookSearchOverlay onBookSelect={handleSelectBook} />
		}
	}

	const renderBookPickerOption = () => {
		if (isDefiningExternalBook) return null

		return (
			<>
				<div>
					<Heading size="xs">Pick a book</Heading>
					<Text variant="muted" size="sm" className="mt-1">
						You can add a book from your library
					</Text>
				</div>

				<div className="flex justify-between gap-4">
					{renderBookInfo()}
					{renderSelectedBookOptions()}
				</div>
			</>
		)
	}

	const renderExternalBookOption = () => {
		if (isEntityBook) return null

		return (
			<>
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
			</>
		)
	}

	return (
		<Card className="flex w-full flex-col gap-4 p-4">
			{renderBookPickerOption()}
			{!isEntityBook && !isDefiningExternalBook && <LeftAlignedDivider text="OR" />}
			{renderExternalBookOption()}

			<LeftAlignedDivider text="AND THEN" />

			<div>
				<Heading size="xs">Configure the dates</Heading>
				<Text variant="muted" size="sm" className="mt-1">
					If not provided, the start and end dates will be set to a reasonable default based on the
					last book&apos;s end date
				</Text>
			</div>

			<div className="flex w-full flex-col items-start gap-x-4 gap-y-4 md:flex-row md:gap-y-0">
				<DatePicker
					label="Start date"
					minDate={new Date()}
					onChange={(date) => form.setValue(`books.${index}.start_at`, date?.toISOString())}
				/>

				<DatePicker
					label="End date"
					minDate={new Date()}
					onChange={(date) => form.setValue(`books.${index}.end_at`, date?.toISOString())}
				/>
			</div>
		</Card>
	)
}

const LeftAlignedDivider = ({ text }: { text: string }) => (
	<div className="relative">
		<div className="absolute inset-0 flex items-center" aria-hidden="true">
			<div className="w-full border-t border-gray-75 dark:border-gray-800" />
		</div>
		<div className="relative flex justify-start">
			<span className="bg-white pr-2 text-sm text-gray-400 dark:bg-gray-975 dark:text-gray-600">
				{text}
			</span>
		</div>
	</div>
)

const objectHasOneKeyWithLength = (obj: Record<string, string>) =>
	Object.values(obj).some((key) => !!key.length)
