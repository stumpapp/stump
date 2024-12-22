import { Button, Sheet, Text } from '@stump/components'
import { Filter } from 'lucide-react'
import { useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useFilterContext } from './context'
import { FilterableEntity, MediaFilterForm, SeriesFilterForm } from './form'

type Props = {
	/**
	 * The prompt to display in the filter slide over. This is effectively the subtitle.
	 * Maybe I should just name it that?
	 */
	prompt?: string
	/**
	 * The form variant to render in the slide over. I.e. media or series or library
	 */
	formVariant: FilterableEntity
}

/**
 * A component that renders a slide over with filter options.
 */
export default function FilterSlideOver({ prompt, formVariant }: Props) {
	const { filters, setFilters } = useFilterContext()

	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')

	// We don't apply search within the slideover, so we want to exclude it from the count. If any
	// other 'filters' are added outside the context of this component we need to account for them, as well.
	const nonSearchFilterCount = Object.keys(filters || {}).length - (filters?.search ? 1 : 0)

	const onClose = () => setIsOpen(false)
	const onOpen = () => setIsOpen(true)

	const handleClearFilters = () => {
		setFilters({})
	}

	/**
	 * A simple function that renders the correct form variant based on the formVariant prop.
	 */
	const renderFormVariant = () => {
		if (formVariant === 'media') {
			return <MediaFilterForm />
		} else if (formVariant === 'series') {
			return <SeriesFilterForm />
		} else {
			return <Text>Not implemented yet</Text>
		}
	}

	return (
		<Sheet
			open={isOpen}
			onClose={onClose}
			onOpen={onOpen}
			title="Filter options"
			description={prompt || 'Use the options below to narrow your search'}
			trigger={
				<Button variant="ghost" className="flex h-full items-center gap-1.5">
					<Filter className="h-4 w-4" />
					<span>Filter</span>
					<span className="text-brand">({nonSearchFilterCount})</span>
				</Button>
			}
			size={isMobile ? 'xl' : 'default'}
			footer={
				<div className="flex items-center gap-4 py-2">
					<Button type="button" variant="danger" onClick={handleClearFilters}>
						Clear filters
					</Button>

					<Button type="submit" form="filter-form">
						Apply filters
					</Button>
				</div>
			}
		>
			{renderFormVariant()}
		</Sheet>
	)
}
