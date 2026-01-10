import { Label, RawSwitch } from '@stump/components'

import { useDebugStore } from '@/stores'

const IS_DEVELOPMENT = import.meta.env.DEV

export default function Container() {
	if (!IS_DEVELOPMENT) return null

	return <DebugSettings />
}

function DebugSettings() {
	const store = useDebugStore()

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h3 className="text-base font-medium text-foreground">Debug settings</h3>
				<p className="text-sm text-foreground-muted">
					These won&apos;t exist in production, but are useful for debugging
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label className="flex items-center justify-between rounded-lg border border-dashed border-fill-brand/40 bg-fill-brand-secondary p-3">
					<div className="flex flex-col gap-1">
						<span>Query Tools</span>
						<p className="text-muted-foreground text-sm">Enable debugging tools for queries</p>
					</div>
					<RawSwitch
						id="showQueryTools"
						className="data-[state=checked]:bg-fill-brand-secondary/60 data-[state=unchecked]:bg-fill-brand-secondary"
						checked={store.showQueryTools}
						onCheckedChange={(checked) => store.patch({ showQueryTools: checked })}
					/>
				</Label>
			</div>
		</div>
	)
}
