import { Meta, StoryObj } from '@storybook/react'

import { Switch } from './Switch'

const StoryMeta: Meta<typeof Switch> = {
	component: Switch,
	title: 'input/Switch',
}
type Story = StoryObj<typeof Switch>

export const Default: Story = {
	render: () => <Switch label="My Label" />,
}

export const Primary: Story = {
	render: () => <Switch label="My Label" variant="primary" />,
}

export default StoryMeta
