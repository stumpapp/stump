import { useMemo } from 'react'

import { Any } from '..'
import { Text } from '../text'

export type PreformattedProps = { title?: string; content: Any }

export function Preformatted({ title, content }: PreformattedProps) {
	const memoContent = useMemo(() => JSON.stringify(content, null, 2), [content])

	const formatted = (
		<div className="p-4 rounded-sm bg-muted">
			<pre className="text-xs text-foreground">{memoContent}</pre>
		</div>
	)

	if (!title) {
		return formatted
	}

	return (
		<div className="pb-0 flex flex-col">
			<div className="h-10 px-4 flex items-center bg-muted">
				<Text size="sm" className="font-medium">
					{title}
				</Text>
			</div>
			{formatted}
		</div>
	)
}
