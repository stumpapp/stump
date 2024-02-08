import { Meta, StoryObj } from '@storybook/react'
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

const StoryMeta: Meta<typeof ComboBox> = {
	component: ComboBox,
	title: 'select/ComboBox',
}
type Story = StoryObj<typeof ComboBox>

type DemoProps = Omit<ComponentProps<typeof ComboBox>, 'children'>
const Demo = (args: DemoProps) => {
	const [value, setValue] = useState<string | string[] | undefined>(undefined)

	return (
		<div className="flex h-full w-full items-center justify-center">
			{/* @ts-expect-error: its fine */}
			<ComboBox {...args} value={value} onChange={setValue} />
		</div>
	)
}

export const Default: Story = {
	render: () => <Demo options={frameworks} />,
}

export const Filterable: Story = {
	render: () => <Demo filterable options={frameworks} />,
}

export const MultiSelect: Story = {
	render: () => <Demo filterable isMultiSelect options={frameworks} />,
}

export default StoryMeta
