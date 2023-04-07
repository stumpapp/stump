import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps, useState } from 'react'

import { NativeSelect } from './NativeSelect'

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
	component: NativeSelect,
	title: 'select/NativeSelect',
} as ComponentMeta<typeof NativeSelect>

type StoryProps = Omit<ComponentProps<typeof NativeSelect>, 'children'>
const Story = (args: StoryProps) => {
	const [value, setValue] = useState<string | string[] | undefined>(undefined)

	return (
		<div className="flex h-full w-full items-center justify-center">
			{/* @ts-expect-error: its fine */}
			<NativeSelect {...args} value={value} onChange={setValue} />
		</div>
	)
}
const Template: ComponentStory<typeof NativeSelect> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	options: frameworks,
}
