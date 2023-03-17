import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ConfirmationModal } from './ConfirmationModal'

export default {
	component: ConfirmationModal,
	title: 'dialog/ConfirmationModal',
} as ComponentMeta<typeof ConfirmationModal>

const Template: ComponentStory<typeof ConfirmationModal> = (args) => <ConfirmationModal {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'Are you sure you want to do that thing?',
	closeIcon: true,
	confirmText: 'Yuh huh',
	description: 'This action cannot be undone, tho',
	label: 'Open',
	title: 'Are you sure?',
}
