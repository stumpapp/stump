import { Input, Text } from '@stump/components'
import { useCallback, useEffect, useState } from 'react'

import { useURLPageParams } from './useFilterScene'

export default function URLPageSize() {
	const { pageSize, setPageSize } = useURLPageParams()
	const [inputPageSize, setInputPageSize] = useState<number | undefined>(pageSize)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = parseInt(e.target.value)
		setInputPageSize(isNaN(parsed) ? undefined : parsed)
	}

	const handleInputSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (inputPageSize != undefined && inputPageSize > 0) {
				setPageSize(inputPageSize)
			}
		},
		[inputPageSize, setPageSize],
	)

	useEffect(() => {
		setInputPageSize(pageSize)
	}, [pageSize])

	return (
		<form className="flex shrink-0 items-center space-x-2" onSubmit={handleInputSubmit}>
			<Input
				type="number"
				variant="activeGhost"
				size="sm"
				className="h-7 w-7 p-0 text-center text-xs [appearance:textfield] sm:h-6 sm:w-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				value={inputPageSize ?? ''}
				onChange={handleInputChange}
				min={1}
			/>
			<Text size="sm" variant="muted" className="inline-flex shrink-0">
				per page
			</Text>
		</form>
	)
}
