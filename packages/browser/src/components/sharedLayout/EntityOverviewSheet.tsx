import { SheetPrimitive as Sheet, StatCard, Text } from '@stump/components'

import { useTheme } from '@/hooks'

type Stat = React.ComponentProps<typeof StatCard>

type Props = {
	isOpen: boolean
	onClose: () => void
	name: string
	description?: string | null
	tags: string[] | null
	stats?: Stat[]
	children?: React.ReactNode
}

export function EntityOverviewSheet({
	isOpen,
	onClose,
	name,
	description,
	tags,
	stats,
	children,
}: Props) {
	const { isDarkVariant } = useTheme()

	return (
		<Sheet open={isOpen} onOpenChange={(nowOpen) => !nowOpen && onClose()}>
			<Sheet.Content className="overflow-y-auto" closeIcon>
				<Sheet.Header>
					<Sheet.Title className="text-2xl">{name}</Sheet.Title>
					{(description || !!tags?.length) && (
						<Sheet.Description className="text-base">
							{description}

							{!!tags?.length && (
								<div className="mt-2 gap-3 flex flex-row flex-wrap">
									{tags?.map((tag) => (
										<Text key={tag} size="sm" className="text-muted-foreground">
											#{tag}
										</Text>
									))}
								</div>
							)}
						</Sheet.Description>
					)}
				</Sheet.Header>

				<div className="px-4 pb-4 gap-8 flex flex-1 flex-col">
					{stats && (
						<div className="gap-2 grid grid-cols-2">
							{stats.map((stat, index) => (
								<StatCard key={index} {...stat} isDark={isDarkVariant} />
							))}
						</div>
					)}

					{children}
				</div>
			</Sheet.Content>
		</Sheet>
	)
}
