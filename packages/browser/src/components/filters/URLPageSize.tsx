import { Input, Text } from '@stump/components'
import React, { useCallback, useEffect, useState } from 'react'

import { useFilterContext } from './context'

export default function URLPageSize() {
	const {
		pagination: { page_size },
		setFilter,
	} = useFilterContext()
	const [inputPageSize, setInputPageSize] = useState<number | undefined>(page_size)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = parseInt(e.target.value)
		setInputPageSize(isNaN(parsed) ? undefined : parsed)
	}

	const handleInputSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (inputPageSize !== undefined && inputPageSize > 0) {
				setFilter('page_size', inputPageSize)
			}
		},
		[inputPageSize, setFilter],
	)

	useEffect(() => {
		setInputPageSize(page_size)
	}, [page_size])

	return (
		<form className="flex shrink-0 items-center space-x-2" onSubmit={handleInputSubmit}>
			<Input
				type="number"
				variant="activeGhost"
				size="sm"
				className="h-7 w-7 p-0 text-center text-xs [appearance:textfield] sm:h-6 sm:w-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				value={inputPageSize || page_size}
				onChange={handleInputChange}
				min={1}
			/>
			<Text size="sm" variant="muted" className="inline-flex shrink-0">
				per page
			</Text>
		</form>
	)
}
