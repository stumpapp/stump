import { Button, Sheet } from '@stump/components'
import { BookCardFragment } from '@stump/graphql'
import { Search } from 'lucide-react'
import { useState } from 'react'

import BookSearch from './BookSearch'

type SheetProps = {
	trigger?: React.ReactNode
	footer?: React.ReactNode
	prompt?: string
}

type Props = {
	onBookSelect: (book: BookCardFragment) => void
	sheetProps?: SheetProps
}

export default function BookSearchOverlay({ onBookSelect, sheetProps }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const renderTrigger = () => {
		if (sheetProps?.trigger) {
			return sheetProps.trigger
		}

		return (
			<Button variant="secondary" className="flex h-full items-center gap-1.5">
				<Search className="h-4 w-4" />
				<span>Search for a book</span>
			</Button>
		)
	}

	const handleSelectBook = (book: BookCardFragment) => {
		onBookSelect(book)
		setIsOpen(false)
	}

	return (
		<Sheet
			open={isOpen}
			onClose={() => setIsOpen(false)}
			onOpen={() => setIsOpen(true)}
			title="Search for a book"
			description={sheetProps?.prompt || 'You can use the search bar below to find a book'}
			trigger={renderTrigger()}
			size="xl"
		>
			<div className="flex flex-1 flex-col overflow-hidden p-4">
				<BookSearch onBookSelect={handleSelectBook} />
			</div>
		</Sheet>
	)
}
