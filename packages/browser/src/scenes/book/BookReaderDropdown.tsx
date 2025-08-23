import { ButtonOrLink, DropdownMenu, IconButton } from '@stump/components'
import { BookCardFragment } from '@stump/graphql'
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { usePaths } from '@/paths'
import { EBOOK_EXTENSION } from '@/utils/patterns'

type Props = {
	book: BookCardFragment
}

export default function BookReaderDropdown({ book }: Props) {
	const navigate = useNavigate()
	const paths = usePaths()

	const currentPage = useMemo(() => book.readProgress?.page ?? -1, [book])
	/**
	 * A boolean used to control the rendering of the 'Read again' prompt. A book
	 * is considered to be read again if:
	 *
	 * - It has been completed AND the current page is the last page
	 * - It has been completed AND is an epub AND there is no current epubcfi
	 */
	const isReadAgain = useMemo(() => {
		if (!book) return false

		return isReadAgainPrompt(book)
	}, [book])

	const epubcfi = book?.readProgress?.epubcfi
	const title = useMemo(() => {
		if (isReadAgain) {
			return 'Read again'
		} else if (currentPage > 0 || !!epubcfi) {
			return 'Continue reading'
		} else {
			return 'Read'
		}
	}, [isReadAgain, currentPage, epubcfi])

	/**
	 * The URL to use when the user wants to continue reading from where they last left off
	 */
	const continueReadingLink = useMemo(() => {
		if (!book.readProgress) return undefined

		const { page, epubcfi } = book.readProgress

		if (epubcfi) {
			return paths.bookReader(book.id, {
				epubcfi,
				isEpub: true,
			})
		} else if (!!page && page > 0) {
			return paths.bookReader(book.id, { page })
		} else {
			return undefined
		}
	}, [book])

	/**
	 * The URL to use when the user wants to read from the beginning
	 */
	const getReadFromBeginningLink = useCallback(
		(incognito: boolean) => {
			const { id, extension } = book

			if (extension.match(EBOOK_EXTENSION)) {
				return paths.bookReader(id, {
					isEpub: true,
					isIncognito: incognito || undefined,
				})
			} else {
				return paths.bookReader(id, { isIncognito: incognito || undefined, page: 1 })
			}
		},
		[book],
	)

	/**
	 * The URL to use for the read link. If the book is an epub, the epubcfi is used
	 * to open the book at the correct location. Otherwise, the page number is used.
	 *
	 * If the book is completed, the read link will omit the epubcfi or page number
	 */
	const readUrl = useMemo(() => {
		const { id, readProgress, extension } = book

		const { epubcfi, page } = readProgress || {}

		if (epubcfi || extension.match(EBOOK_EXTENSION)) {
			return paths.bookReader(id, {
				epubcfi: isReadAgain ? undefined : epubcfi,
				isEpub: true,
			})
		} else {
			return paths.bookReader(id, { page: isReadAgain ? 1 : page || 1 })
		}
	}, [book, isReadAgain])

	return (
		<div className="flex items-center">
			<ButtonOrLink
				className="w-full rounded-r-none"
				variant="primary"
				href={readUrl}
				title={title}
			>
				{title}
			</ButtonOrLink>
			<DropdownMenu
				align="end"
				contentWrapperClassName="w-18"
				trigger={
					<IconButton className="rounded-l-none" variant="primary">
						<ChevronDown className="h-4 w-4" />
					</IconButton>
				}
				groups={[
					{
						items: [
							{
								disabled: !continueReadingLink,
								label: 'Continue reading',
								onClick: () => continueReadingLink && navigate(continueReadingLink),
							},
							{
								label: 'Read from beginning',
								onClick: () => navigate(getReadFromBeginningLink(false)),
							},
							{
								label: 'Incognito mode',
								onClick: () => navigate(getReadFromBeginningLink(true)),
							},
						],
					},
				]}
			/>
		</div>
	)
}

export const isReadAgainPrompt = (
	book: Pick<BookCardFragment, 'pages' | 'readProgress' | 'readHistory' | 'extension'>,
) => {
	const { pages, readProgress, readHistory, extension } = book
	const { page, epubcfi } = readProgress || {}

	const isHistoricallyCompleted = readHistory?.some((h) => h.completedAt) ?? false

	const isEpub = extension.match(EBOOK_EXTENSION)
	const epubCompleted = isEpub && !epubcfi && isHistoricallyCompleted
	const otherCompleted = !isEpub && page === pages && isHistoricallyCompleted

	return epubCompleted || otherCompleted
}
