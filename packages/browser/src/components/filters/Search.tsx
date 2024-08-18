import { cn, Input, ProgressSpinner, usePreviousIsDifferent } from '@stump/components'
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
	/**
	 *  Whether or not the search input should be disabled
	 */
	isDisabled?: boolean
}

/**
 * A search input that debounces the onChange function
 */
export default function Search({
	initialValue,
	label,
	placeholder,
	onChange,
	isLoading,
	isDisabled,
}: Props) {
	const [isFocused, setIsFocused] = useState(false)
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
			title={isDisabled ? "This functionality isn't available right now" : undefined}
			label={label}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
			onChange={(e) => setValue(e.target.value)}
			placeholder={placeholder || 'Search'}
			value={value}
			fullWidth
			size="sm"
			variant="activeGhost"
			leftDecoration={<SearchIcon className="h-4 w-4 text-foreground-muted" />}
			rightDecoration={showLoader ? <ProgressSpinner size="sm" /> : null}
			className={cn(
				'flex-grow transition-[width] duration-200 ease-in-out',
				{ 'w-full flex-grow sm:w-2/5': isFocused },
				{ 'w-2/3 cursor-pointer pr-0 sm:w-3/5  md:w-1/5': !isFocused },
			)}
			disabled={isDisabled}
		/>
	)
}
