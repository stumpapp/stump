import { AspectRatio, Button, Card, DatePicker, Heading, Input, Text } from '@stump/components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import type { BookSearchSelection } from '@/components/book/BookSearch'
import BookSearchOverlay from '@/components/book/BookSearchOverlay'
import { EntityImage } from '@/components/entity'
import { useTranslate } from '@/hooks/useTranslate'

import { defaultBook, Schema } from './CreateOrAddToScheduleForm'

type Props = {
	index: number
}

// FIXME(clubs): this component is a MESS and desperately needs a rewrite

export default function AddBookCard({ index }: Props) {
	const { t, translate } = useTranslate()
	const [selectedBook, setSelectedBook] = useState<BookSearchSelection | null>(null)

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
		(book: BookSearchSelection) => {
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
				<div className="ml-4 gap-1.5 flex flex-col">
					<Heading size="sm" className="text-sm md:text-lg">
						{bookName}
					</Heading>
					<div>
						<Button
							variant="destructive"
							onClick={() => setSelectedBook(null)}
							className="shrink-0"
						>
							{t('bookClub.scheduler.removeSelection')}
						</Button>
					</div>
				</div>
			</div>
		)
	}, [selectedBook, t])

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
					<Heading size="xs">{t('bookClub.scheduler.pickABook')}</Heading>
					<Text variant="muted" size="sm" className="mt-1">
						{t('bookClub.scheduler.pickABookDescription')}
					</Text>
				</div>

				<div className="gap-4 flex justify-between">
					{renderBookInfo()}
					{renderSelectedBookOptions()}
				</div>
			</>
		)
	}, [isDefiningExternalBook, renderBookInfo, renderSelectedBookOptions, t])

	const renderExternalBookOption = () => {
		if (isEntityBook) return null

		return (
			<>
				<div>
					<Heading size="xs">{t('bookClub.scheduler.addExternalBook')}</Heading>
					<Text variant="muted" size="sm" className="mt-1">
						{t('bookClub.scheduler.addExternalBookDescription')}
					</Text>
				</div>

				<div className="gap-x-4 gap-y-4 md:flex-row md:gap-y-0 flex w-full flex-col items-start">
					<Input
						fullWidth
						label={translate('shared.bookMetadata.title')}
						disabled={isEntityBook}
						{...form.register(`books.${index}.book.title`)}
					/>
					<Input
						label={t('bookClub.scheduler.author')}
						disabled={isEntityBook}
						{...form.register(`books.${index}.book.author`)}
					/>
				</div>

				<Input
					label={t('bookClub.scheduler.bookUrl')}
					disabled={isEntityBook}
					{...form.register(`books.${index}.book.url`)}
				/>
			</>
		)
	}

	return (
		<Card className="gap-4 p-4 flex w-full flex-col">
			{renderBookPickerOption()}
			{!isEntityBook && !isDefiningExternalBook && <LeftAlignedDivider text={t('common.or')} />}
			{renderExternalBookOption()}

			<LeftAlignedDivider text={t('bookClub.scheduler.andThen')} />

			<div>
				<Heading size="xs">{t('bookClub.scheduler.configureDates')}</Heading>
				<Text variant="muted" size="sm" className="mt-1">
					{t('bookClub.scheduler.configureDatesDescription')}
				</Text>
			</div>

			<div className="gap-x-4 gap-y-4 md:flex-row md:gap-y-0 flex w-full flex-col items-start">
				<DatePicker
					label={t('bookClub.scheduler.startDate')}
					minDate={new Date()}
					onChange={(date) => form.setValue(`books.${index}.startAt`, date?.toISOString())}
				/>

				<DatePicker
					label={t('bookClub.scheduler.endDate')}
					minDate={new Date()}
					onChange={(date) => form.setValue(`books.${index}.endAt`, date?.toISOString())}
				/>
			</div>
		</Card>
	)
}

const LeftAlignedDivider = ({ text }: { text: string }) => (
	<div className="relative">
		<div className="inset-0 absolute flex items-center" aria-hidden="true">
			<div className="w-full border-t border-border" />
		</div>
		<div className="relative flex justify-start">
			<span className="pr-2 text-sm text-muted-foreground">{text}</span>
		</div>
	</div>
)

const objectHasOneKeyWithLength = (obj: Record<string, string>) =>
	Object.values(obj).some((key) => !!key?.length && key.length > 0)
