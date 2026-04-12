import { useCallback, useEffect, useId, useState } from 'react'

import { Input } from '../input'
import { Text } from '../text'
import { ConfirmationModal, ConfirmationModalProps } from './ConfirmationModal'

export type TypeToConfirmModalProps = Omit<
	ConfirmationModalProps,
	'children' | 'confirmDisabled' | 'formId' | 'onConfirm'
> & {
	/** The exact string the user must type to enable the confirm button */
	confirmationValue: string
	/** Instruction text displayed above the input */
	instructionText: React.ReactNode
	/** Called when the user confirms after typing the correct value */
	onConfirm: () => void
}

export function TypeToConfirmModal({
	confirmationValue,
	instructionText,
	onConfirm,
	isOpen,
	...rest
}: TypeToConfirmModalProps) {
	const formId = useId()
	const [inputValue, setInputValue] = useState('')

	useEffect(() => {
		setInputValue('')
	}, [isOpen])

	const isMatch = confirmationValue.length > 0 && inputValue === confirmationValue

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (isMatch) {
				onConfirm()
			}
		},
		[isMatch, onConfirm],
	)

	return (
		<ConfirmationModal {...rest} isOpen={isOpen} formId={formId} confirmDisabled={!isMatch}>
			<form id={formId} onSubmit={handleSubmit} className="gap-2 py-2 flex flex-col">
				<Text size="sm">{instructionText}</Text>
				<Input
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder={confirmationValue}
					autoComplete="off"
					autoFocus
					fullWidth
				/>
			</form>
		</ConfirmationModal>
	)
}
