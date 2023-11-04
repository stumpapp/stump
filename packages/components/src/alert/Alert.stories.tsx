import { Meta, StoryObj } from '@storybook/react'

import { Alert } from './Alert'

const StoryMeta: Meta<typeof Alert> = {
	component: Alert,
	title: 'alert/Alert',
}

type Story = StoryObj<typeof Alert>

export const Default: Story = {
	render: () => <Alert>My Alert</Alert>,
}

export default StoryMeta
