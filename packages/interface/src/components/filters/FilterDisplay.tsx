import { Badge, Card, Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFilterContext } from './context'

const MATCH_KEYS = ['search']

const flattenObject = (obj: object, prefix = ''): Record<string, unknown[]> => {
	return Object.keys(obj).reduce((acc, key) => {
		const value = obj[key as keyof typeof obj]

		if (typeof value === 'object' && !Array.isArray(value)) {
			const nestedPrefix = prefix ? `${prefix}.${key}` : key
			const nestedFlattened = flattenObject(value, nestedPrefix)
			Object.assign(acc, nestedFlattened)
		} else {
			const newKey = prefix ? `${prefix}.${key}` : key
			acc[newKey] = Array.isArray(value) ? value : [value]
		}

		return acc
	}, {} as Record<string, unknown[]>)
}

/**
 * A component that displays the current filters in a human-readable format.
 */
export default function FilterDisplay() {
	const { filters } = useFilterContext()

	const filterMapping = useMemo(() => flattenObject(filters || {}), [filters])

	const renderPredicate = (key: string, values: unknown[]) => {
		const isMatchKey = MATCH_KEYS.includes(key)
		if (values.length > 1 && !isMatchKey) {
			return 'is any of'
		} else if (values.length === 1 && !isMatchKey) {
			return 'is'
		} else if (values.length === 1 && isMatchKey) {
			return 'matches'
		} else {
			return 'matches any of'
		}
	}

	// if empty, return null
	if (!Object.keys(filterMapping).length) {
		return null
	}

	return (
		<Card className="hidden p-4 md:inline-block">
			<div className="flex items-center gap-4">
				{Object.entries(filterMapping).map(([key, values]) => {
					return (
						<div key={key} className="flex items-center gap-1">
							<Text size="sm" variant="muted">
								{key} {renderPredicate(key, values)}
							</Text>

							{values.map((value) => {
								return (
									<Badge key={value as string} size="xs">
										{value as string}
									</Badge>
								)
							})}
						</div>
					)
				})}
			</div>
		</Card>
	)
}
