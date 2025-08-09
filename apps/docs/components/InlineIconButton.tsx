import clsx from 'clsx'
import React from 'react'

interface InlineIconButtonProps {
	children: React.ReactNode
	text?: string
	size?: number
}

export default function InlineIconButton(props: InlineIconButtonProps) {
	const size = props.size ? props.size : 16

	return (
		<span
			className={clsx(
				'inline-flex items-center rounded-md bg-[#D3D5D7] px-1 text-black dark:bg-[#161719] dark:text-[#D3D5D7]',
				{ 'p-1': !props.text },
			)}
		>
			{React.cloneElement(props.children as React.ReactElement, { size })}
			{props.text && <span className="ml-1">{props.text}</span>}
		</span>
	)
}
