import { Meta, StoryObj } from '@storybook/react'
import { Moon, Sun } from 'lucide-react'
import { ComponentProps } from 'react'

import { IconButton } from './IconButton'

const StoryMeta: Meta<typeof IconButton> = {
	component: IconButton,
	title: 'button/IconButton',
}

const storyIcons = {
	moon: <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />,
	sun: <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />,
}
type StoryProps = {
	icon?: keyof typeof storyIcons
} & Partial<ComponentProps<typeof IconButton>>
const StoryFn = ({ icon = 'moon', ...args }: StoryProps) => (
	<IconButton {...args}>{storyIcons[icon]}</IconButton>
)
type Story = StoryObj<typeof StoryFn>

export const Default: Story = {
	render: () => <StoryFn />,
}

export default StoryMeta
