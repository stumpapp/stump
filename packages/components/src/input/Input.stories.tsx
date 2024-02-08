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

export const Ghost: Story = {
	render: () => <Input variant="ghost" label="ghost" />,
}

export const Underline: Story = {
	render: () => <Input variant="underline" label="underline" />,
}

export const UnderlineInvalid: Story = {
	render: () => <Input isInvalid label="underline" variant="underline" />,
}

export const WithDescription: Story = {
	render: () => <Input description="This is a description" label="Label" />,
}

export const WithDescriptionInvalid: Story = {
	render: () => <Input description="This is a description" isInvalid label="Label" />,
}

export const Primary: Story = {
	render: () => <Input variant="primary" label="primary" />,
}

export const PrimaryInvalid: Story = {
	render: () => <Input isInvalid variant="primary" label="primary" />,
}

export default StoryMeta
