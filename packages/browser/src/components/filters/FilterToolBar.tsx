import { useFilterContext } from './context'
import FilterDisplay from './FilterDisplay'
import FilterSlideOver from './FilterSlideOver'
import { FilterableEntity } from './form'
import OrderBy from './OrderBy'
import Search from './Search'

type Props = {
	/**
	 * The entity to use for the filter slide over. If not provided, the filter
	 * slide over will not be rendered.
	 */
	entity?: FilterableEntity
	/**
	 * Whether or not to render the order by component. If not provided, the order
	 * by component will not be rendered.
	 */
	orderBy?: boolean
	/**
	 * The placeholder text to display in the search input.
	 */
	searchPlaceholder?: string
	/**
	 * The prompt to display in the filter slide over. This is effectively the
	 * subtitle of the slide over.
	 */
	filterSlideOverPrompt?: string
	/**
	 * Whether or not queries in the parent component are currently refetching. This
	 * displays a loading indicator in the search input if true.
	 */
	isRefetching?: boolean
	/**
	 * Whether or not the filter toolbar is disabled
	 */
	isDisabled?: boolean
}

// TODO: Remove
/**
 * A component that renders a set of filter-related components within a header.
 */
export default function FilterToolBar({
	entity,
	orderBy,
	searchPlaceholder,
	filterSlideOverPrompt,
	isRefetching,
	isDisabled,
}: Props) {
	const { search, setSearch, removeSearch } = useFilterContext()

	const renderFilter = !!entity && !isDisabled
	const renderOrderBy = !!orderBy && !!entity && !isDisabled

	return (
		<header className="flex max-w-full flex-col gap-2 px-4">
			<div className="flex flex-col items-center gap-2 md:flex-row">
				<Search
					initialValue={search || ''}
					placeholder={searchPlaceholder}
					onChange={(value) => {
						if (value) {
							setSearch(value)
						} else {
							removeSearch()
						}
					}}
					isLoading={isRefetching}
					isDisabled={isDisabled}
				/>
				<div className="flex w-full shrink-0 gap-2 md:w-auto">
					{renderOrderBy && <OrderBy entity={entity} />}
					{renderFilter && <FilterSlideOver prompt={filterSlideOverPrompt} formVariant={entity} />}
				</div>
			</div>
			<FilterDisplay />
		</header>
	)
}
