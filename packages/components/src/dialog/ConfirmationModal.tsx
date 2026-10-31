import { LucideIcon } from 'lucide-react'
import { useCallback } from 'react'

import { Button } from '../button'
import { PickSelect } from '../utils'
import { AlertDialog, type AlertDialogContentProps } from './alert-dialog'

type ButtonVariant = PickSelect<React.ComponentProps<typeof Button>, 'variant'>
export type ConfirmationModalProps = {
	isOpen?: boolean
	trigger?: string | React.ReactNode
	title: string
	description?: React.ReactNode
	icon?: LucideIcon
	children?: React.ReactNode
	confirmText?: string
	confirmIsLoading?: boolean
	confirmDisabled?: boolean
	cancelText?: string
	triggerVariant?: ButtonVariant
	confirmVariant?: ButtonVariant
	cancelVariant?: ButtonVariant
	formId?: string
	onConfirm?: () => void
	onClose: () => void
} & Pick<AlertDialogContentProps, 'size'>

export function ConfirmationModal({
	isOpen,
	title,
	description,
	icon: Icon,
	children,
	trigger,
	confirmText,
	cancelText,
	confirmIsLoading,
	confirmDisabled,
	triggerVariant,
	confirmVariant = 'default',
	cancelVariant = 'outline',
	formId,
	onConfirm,
	onClose,
	size,
}: ConfirmationModalProps) {
	const handleOpenChange = useCallback(
		(nowOpen: boolean) => {
			if (!nowOpen && !confirmIsLoading) {
				onClose()
			}
		},
		[confirmIsLoading, onClose],
	)

	const confirmProps = {
		variant: confirmVariant,
		disabled: confirmDisabled,
		isLoading: confirmIsLoading,
		children: confirmText || 'Confirm',
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
			{trigger != null && (
				<AlertDialog.Trigger asChild={typeof trigger !== 'string'}>
					{typeof trigger === 'string' ? (
						<Button variant={triggerVariant}>{trigger}</Button>
					) : (
						trigger
					)}
				</AlertDialog.Trigger>
			)}
			<AlertDialog.Content size={size}>
				<AlertDialog.Header>
					{Icon && (
						<AlertDialog.Media>
							<Icon />
						</AlertDialog.Media>
					)}
					<AlertDialog.Title>{title}</AlertDialog.Title>
					{description && <AlertDialog.Description>{description}</AlertDialog.Description>}
				</AlertDialog.Header>
				{children}
				<AlertDialog.Footer>
					<AlertDialog.Cancel variant={cancelVariant} disabled={confirmIsLoading}>
						{cancelText || 'Cancel'}
					</AlertDialog.Cancel>
					{formId ? (
						<Button type="submit" form={formId} {...confirmProps} />
					) : (
						<AlertDialog.Action
							{...confirmProps}
							onClick={(e) => {
								e.preventDefault()
								onConfirm?.()
							}}
						/>
					)}
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog>
	)
}
