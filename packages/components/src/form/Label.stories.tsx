import { Meta, StoryObj } from '@storybook/react'

import { Label } from './Label'

const StoryMeta: Meta<typeof Label> = {
	component: Label,
	title: 'form/Label',
}
type Story = StoryObj<typeof Label>

export const Default: Story = {
	render: () => <Label>My Label</Label>,
}

export default StoryMeta
