import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps } from 'react'

import { ContextMenu } from './ContextMenu'

export default {
	component: ContextMenu,
	title: 'menu/ContextMenu',
} as ComponentMeta<typeof ContextMenu>

type StoryProps = Partial<ComponentProps<typeof ContextMenu>>
const defaultArgs: Omit<ComponentProps<typeof ContextMenu>, 'children'> = {
	groups: [
		{
			items: [
				{
					label: 'Save As...',
					shortCut: '⇧⌘P',
				},
				{
					label: 'Some Action',
				},
			],
		},
		{
			items: [
				{
					label: 'Back',
					shortCut: '⌘[',
				},
				{
					label: 'Forward',
					shortCut: '⌘]',
				},
				{
					label: 'Reload',
					shortCut: '⌘R',
				},
			],
		},
		{
			items: [
				{
					label: 'More',
					subItems: [
						{
							label: 'Cool Stuff',
						},
						{
							label: 'More Cool Stuff',
						},
						{
							label: 'Kier oh kier',
						},
					],
				},
			],
		},
	],
}
const Story = (args: StoryProps) => (
	<ContextMenu groups={args.groups || defaultArgs.groups}>
		<span className="dark:text-gray-50">Right click me</span>
	</ContextMenu>
)
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {}
