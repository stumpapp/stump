import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps } from 'react'

import { Button, Text } from '..'
import { Popover } from './Popover'

export default {
	component: Popover,
	title: 'popover/Popover',
} as ComponentMeta<typeof Popover>

type StoryProps = Omit<ComponentProps<typeof Popover.Content>, 'children'>
const Story = (args: StoryProps) => {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<Popover>
				<Popover.Trigger>
					<Button>Trigger</Button>
				</Popover.Trigger>
				<Popover.Content {...args}>
					<Text>Content!</Text>
				</Popover.Content>
			</Popover>
		</div>
	)
}
const Template: ComponentStory<typeof Popover.Content> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {}
