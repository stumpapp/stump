import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ScanFace, Search } from 'lucide-react'
import { ComponentProps } from 'react'

import { CommandPrompt } from './CommandPrompt'

export default {
	component: CommandPrompt,
	title: 'command/CommandPrompt',
} as ComponentMeta<typeof CommandPrompt>

type StoryProps = Partial<ComponentProps<typeof CommandPrompt>>
const defaultArgs: Omit<ComponentProps<typeof CommandPrompt>, 'children'> = {
	groups: [
		{
			heading: 'Suggestions',
			items: [
				{
					icon: Search,
					label: 'Last Search: "lotr AND (high-fantasy OR sword-and-sorcery)"',
					onSelect: () => alert('Last Search: "lotr AND (high-fantasy OR sword-and-sorcery)"'),
					shortcut: '⌘⇧L',
				},
				{
					icon: ScanFace,
					label: 'Scan libraries',
					onSelect: () => alert('Scan libraries'),
					shortcut: '⌘⇧S',
				},
			],
		},
		{
			heading: 'Actions',
			items: [
				{
					label: 'Toggle App Theme',
					onSelect: () => alert('Toggle App Theme'),
					shortcut: '⌘⇧T',
				},
			],
		},
		{
			items: [
				{
					label: 'This group has no heading!',
				},
			],
		},
	],
}
const Story = (args: StoryProps) => (
	<>
		<p>
			Press {'⌘'}
			{args.triggerKey || 'k'}
		</p>
		<CommandPrompt groups={args.groups || defaultArgs.groups} {...args} />
	</>
)
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {}
