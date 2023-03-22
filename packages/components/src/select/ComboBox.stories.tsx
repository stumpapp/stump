import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps, useState } from 'react'

import { ComboBox } from './ComboBox'

const frameworks = [
	{
		label: 'Next.js',
		value: 'next.js',
	},
	{
		label: 'SvelteKit',
		value: 'sveltekit',
	},
	{
		label: 'Nuxt.js',
		value: 'nuxt.js',
	},
	{
		label: 'Remix',
		value: 'remix',
	},
	{
		label: 'Astro',
		value: 'astro',
	},
]

export default {
	component: ComboBox,
	title: 'select/ComboBox',
} as ComponentMeta<typeof ComboBox>

type StoryProps = Omit<ComponentProps<typeof ComboBox>, 'children'>
const Story = (args: StoryProps) => {
	const [value, setValue] = useState<string | string[] | undefined>(undefined)

	return (
		<div className="flex h-full w-full items-center justify-center">
			{/* @ts-expect-error: its fine */}
			<ComboBox {...args} value={value} onChange={setValue} />
		</div>
	)
}
const Template: ComponentStory<typeof ComboBox> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	isMultiSelect: false,
	options: frameworks,
}

export const Filterable = Template.bind({})
Filterable.args = {
	filterable: true,
	isMultiSelect: false,
	options: frameworks,
}

export const MultiSelect = Template.bind({})
MultiSelect.args = {
	filterable: true,
	isMultiSelect: true,
	options: frameworks,
}
