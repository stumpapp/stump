import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps } from 'react'

import { Text } from '..'
import { ToolTip } from './ToolTip'

export default {
	component: ToolTip,
	title: 'tooltip/ToolTip',
} as ComponentMeta<typeof ToolTip>

type StoryProps = Omit<ComponentProps<typeof ToolTip>, 'children'>
const Story = (args: StoryProps) => {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<ToolTip {...args} content={args.content || <Text>Content!</Text>}>
				<Text>Trigger</Text>
			</ToolTip>
		</div>
	)
}
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {}
