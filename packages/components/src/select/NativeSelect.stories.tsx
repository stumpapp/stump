import { Meta, StoryObj } from '@storybook/react'
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

const StoryMeta: Meta<typeof NativeSelect> = {
	component: NativeSelect,
	title: 'select/NativeSelect',
}
type Story = StoryObj<typeof NativeSelect>

type DemoProps = Omit<ComponentProps<typeof NativeSelect>, 'children'>
const Demo = (args: DemoProps) => {
	const [value, setValue] = useState<string | string[] | undefined>(undefined)

	return (
		<div className="flex h-full w-full items-center justify-center">
			{/* @ts-expect-error: its fine */}
			<NativeSelect {...args} value={value} onChange={setValue} />
		</div>
	)
}

export const Default: Story = {
	render: () => <Demo options={frameworks} />,
}

export default StoryMeta
