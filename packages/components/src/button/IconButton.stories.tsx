import { ComponentMeta, ComponentStory } from '@storybook/react'
import { Moon, Sun } from 'lucide-react'
import { ComponentProps } from 'react'

import { IconButton } from './IconButton'

export default {
	component: IconButton,
	title: 'button/IconButton',
} as ComponentMeta<typeof IconButton>

const storyIcons = {
	moon: <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />,
	sun: <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />,
}
type StoryProps = {
	icon?: keyof typeof storyIcons
} & Partial<ComponentProps<typeof IconButton>>
const Story = ({ icon = 'moon', ...args }: StoryProps) => (
	<IconButton {...args}>{storyIcons[icon]}</IconButton>
)
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	size: 'xs',
	variant: 'ghost',
}
