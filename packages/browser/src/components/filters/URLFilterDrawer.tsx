import { Button, IconButton, Sheet, ToolTip } from '@stump/components'
import { Bolt } from 'lucide-react'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { clearFilters, getActiveFilterCount, useFilterContext } from '.'
import { FilterableEntity, MediaFilterForm, SeriesFilterForm } from './form'

type Props = {
	entity: FilterableEntity
}

export default function URLFilterDrawer({ entity }: Props) {
	const { filters, setFilters } = useFilterContext()

	const [isOpen, setIsOpen] = useState(false)

	const isMobile = useMediaMatch('(max-width: 768px)')
	// We don't apply search within the slideover, so we want to exclude it from the count. If any
	// other 'filters' are added outside the context of this component we need to account for them, as well.
	const activeFilters = useMemo(() => getActiveFilterCount(filters || {}), [filters])

	/**
	 * A callback to clear all filters. Certain filters are excluded from this operation,
	 * such as the search filter. See clearFilters for more information.
	 */
	const handleClearFilters = useCallback(
		() => setFilters(clearFilters(filters || {})),
		[filters, setFilters],
	)

	const renderForm = () => {
		if (entity === 'media') {
			return <MediaFilterForm />
		} else if (entity === 'series') {
			return <SeriesFilterForm />
		} else {
			return null
		}
	}

	return (
		<Sheet
			open={isOpen}
			onClose={() => setIsOpen(false)}
			onOpen={() => setIsOpen(true)}
			title="Configure URL filters"
			description="Adjust the filters applied to the current view"
			trigger={
				<ToolTip content="Configure filters" size="sm">
					<span className="relative inline-flex">
						<IconButton
							variant="ghost"
							size="xs"
							className="hover:bg-background-surface-hover"
							pressEffect={false}
							onClick={() => setIsOpen(true)}
						>
							<Bolt className="h-4 w-4" />
						</IconButton>

						{activeFilters > 0 && (
							<span className="right-0 top-0 -mr-1.5 -mt-1.5 h-4 w-4 absolute flex">
								<span className="h-4 w-4 relative inline-flex items-center justify-center rounded-full bg-fill-brand">
									<span className="font-semibold text-white text-xxs">{activeFilters}</span>
								</span>
							</span>
						)}
					</span>
				</ToolTip>
			}
			size={isMobile ? 'xl' : 'default'}
			footer={
				<div className="-mt-4 gap-x-4 py-2 flex w-full items-center">
					<Button
						size="sm"
						className="w-full"
						type="button"
						variant="danger"
						onClick={handleClearFilters}
					>
						Clear filters
					</Button>

					<Button size="sm" type="submit" form="filter-form" className="w-full">
						Apply filters
					</Button>
				</div>
			}
		>
			<Suspense>{renderForm()}</Suspense>
		</Sheet>
	)
}
