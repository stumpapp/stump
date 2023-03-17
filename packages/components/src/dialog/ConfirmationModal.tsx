'use client'

import { Button, PickSelect } from '..'
import { useBoolean } from '../hooks/useBoolean'
import { Dialog } from './primitives'

type ButtonVariant = PickSelect<React.ComponentProps<typeof Button>, 'variant'>
export type ConfirmationModalProps = {
	label: string
	title: string
	description?: string
	children: React.ReactNode
	confirmText?: string
	cancelText?: string
	closeIcon?: boolean
	triggerVariant?: ButtonVariant
	confirmVariant?: ButtonVariant
	cancelVariant?: ButtonVariant
	onConfirm: () => void
}

export function ConfirmationModal({
	title,
	description,
	children,
	label,
	confirmText,
	cancelText,
	closeIcon,
	triggerVariant,
	confirmVariant = 'primary',
	cancelVariant,
	onConfirm,
}: ConfirmationModalProps) {
	const [open, { on, off }] = useBoolean()

	const handleOpenChange = (nowOpen: boolean) => {
		if (nowOpen) {
			on()
		} else {
			off()
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild>
				<Button onClick={on} variant={triggerVariant}>
					{label}
				</Button>
			</Dialog.Trigger>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{title}</Dialog.Title>
					{description && <Dialog.Description>{description}</Dialog.Description>}
					{closeIcon && <Dialog.Close />}
				</Dialog.Header>
				{children}
				<Dialog.Footer>
					<Button variant={cancelVariant} onClick={off}>
						{cancelText || 'Cancel'}
					</Button>
					<Button variant={confirmVariant} onClick={onConfirm}>
						{confirmText || 'Confirm'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
