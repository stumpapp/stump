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
		newYork: true,
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
	render: () => (
		<Button size="md" variant="ghost">
			Button
		</Button>
	),
}

export const LargeGhost: Story = {
	render: () => (
		<Button size="lg" variant="ghost">
			Button
		</Button>
	),
}

export const XSmallPrimary: Story = {
	render: () => (
		<Button size="xs" variant="primary">
			Button
		</Button>
	),
}

export const SmallPrimary: Story = {
	render: () => (
		<Button size="sm" variant="primary">
			Button
		</Button>
	),
}

export const MediumPrimary: Story = {
	render: () => (
		<Button size="md" variant="primary">
			Button
		</Button>
	),
}

export const LargePrimary: Story = {
	render: () => (
		<Button size="lg" variant="primary">
			Button
		</Button>
	),
}

export const Danger: Story = {
	render: () => <Button variant="danger">Button</Button>,
}

export const Outline: Story = {
	render: () => <Button variant="outline">Button</Button>,
}

export const Subtle: Story = {
	render: () => <Button variant="subtle">Button</Button>,
}

export const Loading: Story = {
	render: () => <Button isLoading>Button</Button>,
}

export default StoryMeta
