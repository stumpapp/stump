import { Meta, StoryObj } from '@storybook/react'

import { Badge } from './Badge'

const StoryMeta: Meta<typeof Badge> = {
	component: Badge,
	title: 'badge/Badge',
}

type Story = StoryObj<typeof Badge>

export const Default: Story = {
	render: () => <Badge>My Badge</Badge>,
}

export const Primary: Story = {
	render: () => <Badge variant="primary">My Badge</Badge>,
}

export default StoryMeta
