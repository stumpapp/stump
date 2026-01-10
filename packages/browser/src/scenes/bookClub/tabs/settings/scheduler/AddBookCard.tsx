import { AspectRatio, Button, Card, DatePicker, Heading, Input, Text } from '@stump/components'
import { BookCardFragment } from '@stump/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import BookSearchOverlay from '@/components/book/BookSearchOverlay'
import { EntityImage } from '@/components/entity'

import { defaultBook, Schema } from './CreateOrAddToScheduleForm'

type Props = {
	index: number
}

// FIXME(clubs): this component is a MESS and desperately needs a rewrite

export default function AddBookCard({ index }: Props) {
	const [selectedBook, setSelectedBook] = useState<BookCardFragment | null>(null)

	const form = useFormContext<Schema>()

	const bookOptions = form.watch(`books.${index}`) ?? defaultBook

	const bookDetails = useMemo(() => bookOptions.book, [bookOptions])
	const bookID = useMemo(() => ('id' in bookDetails ? bookDetails.id : undefined), [bookDetails])
	const externalBook = useMemo(
		() => (!('id' in bookDetails) ? bookDetails : undefined),
		[bookDetails],
	)

	const isEntityBook = useMemo(() => !!bookID, [bookID])
	const isDefiningExternalBook = useMemo(
		() => !!externalBook && objectHasOneKeyWithLength(externalBook),
		[externalBook],
	)

	useEffect(() => {
		if (!selectedBook && isEntityBook) {
			form.setValue(`books.${index}.book.id`, '')
		} else if (selectedBook) {
			// TODO: this is annoying and not ideal
			form.setValue(`books.${index}.book.title`, '')
			form.setValue(`books.${index}.book.author`, '')
			form.setValue(`books.${index}.book.url`, undefined)
		}
	}, [isEntityBook, selectedBook, form, index])

	const handleSelectBook = useCallback(
		(book: BookCardFragment) => {
			form.setValue(`books.${index}.book.id`, book.id)
			setSelectedBook(book)
		},
		[form, index],
	)

	const renderBookInfo = useCallback(() => {
		if (!selectedBook) return null

		const bookName = selectedBook.resolvedName

		return (
			<div className="flex">
				<div className="max-h-[195px] w-[125px]">
					<AspectRatio ratio={2 / 3}>
						<EntityImage src={selectedBook.thumbnail.url} className="rounded-md object-cover" />
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
	}, [selectedBook])

	const renderSelectedBookOptions = useCallback(() => {
		if (selectedBook) {
			return null
		} else {
			return <BookSearchOverlay onBookSelect={handleSelectBook} />
		}
	}, [handleSelectBook, selectedBook])

	const renderBookPickerOption = useCallback(() => {
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
	}, [isDefiningExternalBook, renderBookInfo, renderSelectedBookOptions])

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
					onChange={(date) => form.setValue(`books.${index}.startAt`, date?.toISOString())}
				/>

				<DatePicker
					label="End date"
					minDate={new Date()}
					onChange={(date) => form.setValue(`books.${index}.endAt`, date?.toISOString())}
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
	Object.values(obj).some((key) => !!key?.length && key.length > 0)
