import { Input, ProgressSpinner, usePreviousIsDifferent } from '@stump/components'
import { SearchIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'

type Props = {
	/**
	 * The initial value of the search input. This is useful for when you load onto
	 * a page with a search already in the URL.
	 */
	initialValue?: string
	/**
	 * The label to display above the search input.
	 */
	label?: string
	/**
	 * The placeholder text to display in the search input.
	 */
	placeholder?: string
	/**
	 * The function to call when the search input changes. This is debounced by 500ms.
	 */
	onChange: (value: string) => void
	/**
	 * Whether or not the search input should display a loading indicator.
	 */
	isLoading?: boolean
}

/**
 * A search input that debounces the onChange function
 */
export default function Search({ initialValue, label, placeholder, onChange, isLoading }: Props) {
	// we need to debounce the onChange function so we only update once the user has stopped typing
	// this is a common pattern for search inputs
	const [value, setValue] = useState<string | undefined>(initialValue)
	const [debouncedValue] = useDebouncedValue(value, 500)

	// This isn't an ideal check, but it works for now. I was noticing WAY too
	// many renders when I clear the search
	const shouldCall = usePreviousIsDifferent(debouncedValue)

	useEffect(() => {
		if (debouncedValue !== undefined && shouldCall) {
			onChange(debouncedValue)
		}
	}, [debouncedValue, onChange, shouldCall])

	const showLoader = isLoading && value !== undefined && value.length > 0

	return (
		<Input
			label={label}
			placeholder={placeholder || 'Search'}
			fullWidth
			onChange={(e) => setValue(e.target.value)}
			value={value}
			leftDecoration={<SearchIcon className="h-4 w-4 dark:text-gray-300" />}
			rightDecoration={showLoader ? <ProgressSpinner size="sm" /> : null}
			variant="ghost"
			className="flex-grow"
		/>
	)
}
