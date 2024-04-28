import { Button, Sheet } from '@stump/components'
import { Media } from '@stump/types'
import { Search } from 'lucide-react'
import React, { useState } from 'react'

import { ManualFilterProvider } from '../filters/FilterProvider'
import BookSearch from './BookSearch'

type SheetProps = {
	trigger?: React.ReactNode
	footer?: React.ReactNode
	prompt?: string
}

type Props = {
	onBookSelect: (book: Media) => void
	sheetProps?: SheetProps
}

// TODO(bookclub): Refactor this component
export default function BookSearchOverlay({ onBookSelect, sheetProps }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const [page, setPage] = useState(1)

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

	const handleSelectBook = (book: Media) => {
		onBookSelect(book)
		setIsOpen(false)
	}

	return (
		<ManualFilterProvider>
			<Sheet
				open={isOpen}
				onClose={() => setIsOpen(false)}
				onOpen={() => setIsOpen(true)}
				title="Search for a book"
				description={sheetProps?.prompt || 'You can use the search bar below to find a book'}
				trigger={renderTrigger()}
				size="xl"
			>
				<div className="overflow-scroll p-4">
					<BookSearch page={page} setPage={setPage} onBookSelect={handleSelectBook} />
				</div>
			</Sheet>
		</ManualFilterProvider>
	)
}
