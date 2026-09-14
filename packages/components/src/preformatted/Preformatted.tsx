import { Copy, CopyCheck } from 'lucide-react'
import { useMemo } from 'react'

import { Any, useCopyToClipboard } from '..'
import { Button } from '../button'
import { Text } from '../text'

export type PreformattedProps = { title?: string; content: Any }

export function Preformatted({ title, content }: PreformattedProps) {
	const formattedContent = useMemo(() => JSON.stringify(content, null, 2), [content])

	const [copy, didCopy] = useCopyToClipboard(formattedContent)

	const CopyIcon = didCopy ? CopyCheck : Copy

	return (
		<div className="flex w-full flex-col overflow-hidden rounded-xl border border-border">
			<header className="px-4 py-0.5 flex items-center justify-between bg-muted/50">
				{title && (
					<Text size="sm" className="font-medium">
						{title}
					</Text>
				)}

				<div />

				<Button size="icon" onClick={copy} variant="ghost">
					<CopyIcon className="h-4 w-4" />
				</Button>
			</header>

			<div className="gap-2 px-4 py-3.5 flex w-full flex-col">
				<pre className="text-xs font-mono text-foreground">{formattedContent}</pre>
			</div>
		</div>
	)
}
