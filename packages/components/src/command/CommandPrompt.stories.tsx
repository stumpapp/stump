import { Meta, StoryObj } from '@storybook/react'
import { ScanFace, Search } from 'lucide-react'
import { ComponentProps } from 'react'

import { CommandPrompt } from './CommandPrompt'

const StoryMeta: Meta<typeof CommandPrompt> = {
	component: CommandPrompt,
	title: 'command/CommandPrompt',
}
type Story = StoryObj<typeof CommandPrompt>

type DemoProps = Partial<ComponentProps<typeof CommandPrompt>>
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
const Demo = (args: DemoProps) => (
	<>
		<p>
			Press {'⌘'}
			{args.triggerKey || 'k'}
		</p>
		<CommandPrompt groups={args.groups || defaultArgs.groups} {...args} />
	</>
)

export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
