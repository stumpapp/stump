import { Input, ProgressSpinner, usePreviousIsDifferent } from '@stump/components'
import { SearchIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'

type Props = {
	initialValue?: string
	label?: string
	placeholder?: string
	onChange: (value: string) => void
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
		/>
	)
}
