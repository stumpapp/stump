import { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import { ConfirmationModal } from './ConfirmationModal'

const StoryMeta: Meta<typeof ConfirmationModal> = {
	component: ConfirmationModal,
	title: 'dialog/ConfirmationModal',
}
type Story = StoryObj<typeof ConfirmationModal>

const Demo = () => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<ConfirmationModal
			closeIcon={true}
			confirmText="Yuh huh"
			description="This action cannot be undone, tho"
			isOpen={isOpen}
			title="Are you sure?"
			trigger={<button onClick={() => setIsOpen(true)}>Open Modal</button>}
			onConfirm={() => setIsOpen(false)}
			onClose={() => setIsOpen(false)}
		>
			Are you sure you want to do that thing?
		</ConfirmationModal>
	)
}

export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
