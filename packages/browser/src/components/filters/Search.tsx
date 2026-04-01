import { cn, ProgressSpinner, usePreviousIsDifferent } from '@stump/components'
import { SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from 'rooks'

type Props = {
	/**
	 * The initial value of the search input. This is useful for when you load onto
	 * a page with a search already in the URL.
	 */
	initialValue?: string
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
	placeholder,
	onChange,
	isLoading,
	isDisabled,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const [expanded, setExpanded] = useState(() => !!initialValue)
	const [value, setValue] = useState(initialValue ?? '')
	const [debouncedValue] = useDebouncedValue(value, 500)

	const shouldCall = usePreviousIsDifferent(debouncedValue)

	useEffect(() => {
		if (initialValue) {
			setValue(initialValue)
			setExpanded(true)
		}
	}, [initialValue])

	useEffect(() => {
		if (debouncedValue !== undefined && shouldCall) {
			onChange(debouncedValue)
		}
	}, [debouncedValue, onChange, shouldCall])

	const handleExpand = () => {
		if (isDisabled) return
		setExpanded(true)
	}

	useEffect(() => {
		if (!expanded) return
		const el = containerRef.current
		if (!el) return

		const onEnd = (e: TransitionEvent) => {
			if (e.propertyName === 'width') inputRef.current?.focus()
		}
		el.addEventListener('transitionend', onEnd)
		return () => el.removeEventListener('transitionend', onEnd)
	}, [expanded])

	const handleBlur = () => {
		if (!value) setExpanded(false)
	}

	const showLoader = isLoading && !!value

	return (
		<div
			ref={containerRef}
			role={expanded ? undefined : 'button'}
			tabIndex={expanded ? undefined : 0}
			onClick={expanded ? undefined : handleExpand}
			onKeyDown={expanded ? undefined : (e) => e.key === 'Enter' && handleExpand()}
			title={isDisabled ? "This functionality isn't available right now" : undefined}
			className={cn(
				'h-8 gap-2 rounded-xl text-sm ease-in-out relative flex shrink-0 cursor-pointer items-center overflow-hidden border border-edge-subtle bg-transparent transition-all duration-300',
				'text-foreground-muted hover:bg-background-surface hover:text-foreground',
				'disabled:cursor-not-allowed disabled:opacity-50',
				expanded ? 'sm:w-2/5 w-full cursor-text' : 'w-32',
			)}
		>
			<SearchIcon className="ml-2.5 h-4 w-4 shrink-0" />

			{expanded ? (
				<input
					ref={inputRef}
					type="text"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onBlur={handleBlur}
					placeholder={placeholder || 'Search'}
					disabled={isDisabled}
					className="pr-8 text-sm h-full w-full bg-transparent text-foreground-subtle outline-none placeholder:text-foreground-muted"
				/>
			) : (
				<span className="pr-2.5 text-sm whitespace-nowrap select-none">Search</span>
			)}

			{showLoader && (
				<div className="inset-y-0 right-0 pr-2.5 absolute flex items-center">
					<ProgressSpinner size="sm" />
				</div>
			)}
		</div>
	)
}
