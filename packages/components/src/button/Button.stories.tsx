import { Meta, StoryObj } from '@storybook/react'

import { Button } from './Button'

const StoryMeta: Meta<typeof Button> = {
	component: Button,
	title: 'button/Button',
}

type Story = StoryObj<typeof Button>

export const Default: Story = {
	args: {
		children: 'Button',
	},
}

export const XSmallGhost: Story = {
	render: () => (
		<Button size="xs" variant="ghost">
			Button
		</Button>
	),
}

export const SmallGhost: Story = {
	render: () => (
		<Button size="sm" variant="ghost">
			Button
		</Button>
	),
}

export const MediumGhost: Story = {
	render: () => <Button variant="ghost">Button</Button>,
}

export const LargeGhost: Story = {
	render: () => (
		<Button size="lg" variant="ghost">
			Button
		</Button>
	),
}

export const XSmallDefault: Story = {
	render: () => <Button size="xs">Button</Button>,
}

export const SmallDefault: Story = {
	render: () => <Button size="sm">Button</Button>,
}

export const MediumDefault: Story = {
	render: () => <Button>Button</Button>,
}

export const LargeDefault: Story = {
	render: () => <Button size="lg">Button</Button>,
}

export const Danger: Story = {
	render: () => <Button variant="destructive">Button</Button>,
}

export const Outline: Story = {
	render: () => <Button variant="outline">Button</Button>,
}

export const Secondary: Story = {
	render: () => <Button variant="secondary">Button</Button>,
}

export const Loading: Story = {
	render: () => <Button isLoading>Button</Button>,
}

export default StoryMeta
