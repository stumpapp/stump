import { useState } from 'react'

export type useDraftNumberProps = { validate: (number: number) => boolean } & (
	| { initialValue: number; getLatestValue: () => number }
	| { initialValue?: never; getLatestValue?: never }
)

export function useDraftNumber({ initialValue, getLatestValue, validate }: useDraftNumberProps) {
	const [string, setString] = useState(initialValue?.toString() ?? '')
	const reset = () => setString(getLatestValue?.().toString() ?? '')

	const numberOrNaN = Number(string)
	const number = Number.isInteger(numberOrNaN) ? numberOrNaN : undefined
	const isEmpty = string === ''
	const isValid = number !== undefined && validate(number)
	const isInitial = string === initialValue?.toString()

	return {
		string,
		number,
		isEmpty,
		isValid,
		isInitial,
		setString,
		reset,
	}
}

export type DraftNumber = ReturnType<typeof useDraftNumber>
