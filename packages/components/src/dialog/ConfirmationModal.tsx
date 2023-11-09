import { Button } from '../button'
import { PickSelect } from '../utils'
import { Dialog } from './primitives'

type ButtonVariant = PickSelect<React.ComponentProps<typeof Button>, 'variant'>
export type ConfirmationModalProps = {
	isOpen?: boolean
	trigger?: string | React.ReactNode
	title: string
	description?: string
	children?: React.ReactNode
	confirmText?: string
	confirmIsLoading?: boolean
	cancelText?: string
	closeIcon?: boolean
	triggerVariant?: ButtonVariant
	confirmVariant?: ButtonVariant
	cancelVariant?: ButtonVariant
	onConfirm: () => void
	onClose: () => void
}

export function ConfirmationModal({
	isOpen,
	title,
	description,
	children,
	trigger,
	confirmText,
	cancelText,
	confirmIsLoading,
	closeIcon = true,
	triggerVariant,
	confirmVariant = 'primary',
	cancelVariant,
	onConfirm,
	onClose,
}: ConfirmationModalProps) {
	const handleOpenChange = (nowOpen: boolean) => {
		if (!nowOpen && !confirmIsLoading) {
			onClose()
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Trigger asChild={!!trigger && typeof trigger !== 'string'}>
				{typeof trigger === 'string' ? (
					<Button variant={triggerVariant}>{trigger}</Button>
				) : (
					trigger
				)}
			</Dialog.Trigger>
			<Dialog.Content size="sm">
				<Dialog.Header>
					<Dialog.Title>{title}</Dialog.Title>
					{description && <Dialog.Description>{description}</Dialog.Description>}
					{closeIcon && <Dialog.Close onClick={onClose} disabled={confirmIsLoading} />}
				</Dialog.Header>
				{children}
				<Dialog.Footer>
					<Button variant={cancelVariant} onClick={onClose} disabled={confirmIsLoading}>
						{cancelText || 'Cancel'}
					</Button>
					<Button variant={confirmVariant} onClick={onConfirm} isLoading={confirmIsLoading}>
						{confirmText || 'Confirm'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
