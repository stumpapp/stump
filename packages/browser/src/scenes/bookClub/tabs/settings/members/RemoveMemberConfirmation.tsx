import { ConfirmationModal } from '@stump/components'

type Props = {
	isOpen: boolean
	onClose: (didConfirm: boolean) => void
}

export default function RemoveMemberConfirmation({ isOpen, onClose }: Props) {
	return (
		<ConfirmationModal
			isOpen={isOpen}
			onConfirm={() => onClose(true)}
			onClose={() => onClose(false)}
			title="Remove member"
			description="Are you sure you want to remove this member?"
			confirmText="Confirm"
			confirmVariant="danger"
			size="sm"
		/>
	)
}
