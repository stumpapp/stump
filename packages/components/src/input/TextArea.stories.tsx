import { Meta, StoryObj } from '@storybook/react'

import { TextArea } from './TextArea'

const StoryMeta: Meta<typeof TextArea> = {
	component: TextArea,
	title: 'input/TextArea',
}
type Story = StoryObj<typeof TextArea>

export const Default: Story = {
	render: () => <TextArea label="Label" placeholder="Enter your text here..." />,
}

export const Primary: Story = {
	render: () => <TextArea label="Label" variant="primary" placeholder="Hi" />,
}

export default StoryMeta
