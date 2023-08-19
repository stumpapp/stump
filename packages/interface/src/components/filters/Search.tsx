import { Input, ProgressSpinner } from '@stump/components'
import { SearchIcon } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'

type Props = {
	label?: string
	placeholder?: string
	onChange: (value: string) => void
	isLoading?: boolean
}
export default function Search({ label, placeholder, onChange, isLoading }: Props) {
	// we need to debounce the onChange function so we only update once the user has stopped typing
	// this is a common pattern for search inputs
	const [value, setValue] = useState<string>()
	const [debouncedValue] = useDebouncedValue(value, 500)

	// we can now call the onChange function with the debounced value
	useEffect(() => {
		if (debouncedValue !== undefined) {
			onChange(debouncedValue)
		}
	}, [debouncedValue, onChange])

	const showLoader = isLoading && value !== undefined && value.length > 0

	return (
		<Input
			label={label}
			placeholder={placeholder || 'Search'}
			fullWidth
			onChange={(e) => setValue(e.target.value)}
			leftDecoration={<SearchIcon className="h-4 w-4 dark:text-gray-300" />}
			rightDecoration={showLoader ? <ProgressSpinner size="sm" /> : null}
			variant="ghost"
		/>
	)
}
