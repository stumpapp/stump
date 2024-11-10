import { Text } from '../text'

export type PreformattedProps = { title: string; children: React.ReactNode }
export function Preformatted({ title, children }: PreformattedProps) {
	return (
		<div className="flex flex-col pb-0">
			<div className="flex h-10 items-center bg-background-surface px-4">
				<Text size="sm" className="font-medium">
					{title}
				</Text>
			</div>
			<div className="rounded-sm bg-background-surface p-4">
				<pre className="text-xs text-foreground-subtle">{children}</pre>
			</div>
		</div>
	)
}
