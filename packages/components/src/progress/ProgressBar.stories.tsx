import { Meta, StoryObj } from '@storybook/react'
import { ComponentProps, useEffect, useRef, useState } from 'react'

import { ProgressBar } from './ProgressBar'

const StoryMeta: Meta<typeof ProgressBar> = {
	component: ProgressBar,
	title: 'progress/ProgressBar',
}
type Story = StoryObj<typeof ProgressBar>

type DemoProps = ComponentProps<typeof ProgressBar> & {
	animated?: boolean
	speed?: number
}
const Demo = (args: DemoProps) => {
	const interval = useRef<NodeJS.Timeout>(undefined)
	const [value, setValue] = useState(args.value || 0)

	useEffect(() => {
		if (args.animated) {
			if (interval.current) {
				clearInterval(interval.current)
			}

			interval.current = setInterval(() => {
				setValue((value) => (value < 100 ? value + 1 : 0))
			}, args.speed || 100)
		}

		return () => {
			if (interval.current) {
				clearInterval(interval.current)
			}
		}
	}, [args.animated, args.speed])

	return (
		<div className="flex w-full items-center justify-center">
			<ProgressBar {...args} value={value} />
		</div>
	)
}

export const Default: Story = {
	render: () => <Demo value={10} size={'lg'} rounded={'default'} variant={'default'} />,
}

export const Animated: Story = {
	render: () => <Demo animated speed={75} size={'lg'} rounded={'default'} variant={'default'} />,
}

export default StoryMeta
