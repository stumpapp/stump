import { Button, Sheet } from '@stump/components'
import { Search } from 'lucide-react'
import { useState } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import BookSearch, { type BookSearchSelection } from './BookSearch'

type SheetProps = {
	trigger?: React.ReactNode
	footer?: React.ReactNode
	prompt?: string
}

type Props = {
	onBookSelect: (book: BookSearchSelection) => void
	sheetProps?: SheetProps
}

export default function BookSearchOverlay({ onBookSelect, sheetProps }: Props) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)

	const renderTrigger = () => {
		if (sheetProps?.trigger) {
			return sheetProps.trigger
		}

		return (
			<Button variant="secondary" className="gap-1.5 flex h-full items-center">
				<Search className="h-4 w-4" />
				<span>{t('common.searchForABook')}</span>
			</Button>
		)
	}

	const handleSelectBook = (book: BookSearchSelection) => {
		onBookSelect(book)
		setIsOpen(false)
	}

	return (
		<Sheet
			open={isOpen}
			onClose={() => setIsOpen(false)}
			onOpen={() => setIsOpen(true)}
			title={t('common.searchForABook')}
			description={sheetProps?.prompt || t('bookSearchOverlay.description')}
			trigger={renderTrigger()}
			size="xl"
		>
			<div className="p-4 flex flex-1 flex-col overflow-hidden">
				<BookSearch onBookSelect={handleSelectBook} />
			</div>
		</Sheet>
	)
}
