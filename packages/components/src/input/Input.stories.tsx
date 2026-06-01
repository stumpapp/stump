import { Meta, StoryObj } from '@storybook/react'

import { Input } from './Input'

const StoryMeta: Meta<typeof Input> = {
	component: Input,
	title: 'input/Input',
}
type Story = StoryObj<typeof Input>

export const Default: Story = {
	render: () => <Input label="default" />,
}

export const Compact: Story = {
	render: () => <Input size="sm" label="compact" />,
}

export const DefaultInvalid: Story = {
	render: () => <Input isInvalid label="default invalid" />,
}

export const WithDescription: Story = {
	render: () => <Input description="This is a description" label="Label" />,
}

export const WithDescriptionInvalid: Story = {
	render: () => <Input description="This is a description" isInvalid label="Label" />,
}

export const Primary: Story = {
	render: () => <Input label="primary" />,
}

export const PrimaryInvalid: Story = {
	render: () => <Input isInvalid label="primary" />,
}

export default StoryMeta
