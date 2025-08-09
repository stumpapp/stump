import React from 'react'

interface InlineIconProps {
	children: React.ReactNode
	size?: number
}

export default function InlineIcon(props: InlineIconProps) {
	const size = props.size ? props.size : 16

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center' }}>
			{React.cloneElement(props.children as React.ReactElement, { size })}
		</span>
	)
}
