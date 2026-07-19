import { SheetPrimitive as Sheet, StatCard, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useTheme } from '@/hooks'

import ReadMore from '../ReadMore'

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
	const { t } = useLocaleContext()
	const { isDarkVariant } = useTheme()

	return (
		<Sheet open={isOpen} onOpenChange={(nowOpen) => !nowOpen && onClose()}>
			<Sheet.Content className="overflow-y-auto" closeIcon>
				<Sheet.Header>
					<Sheet.Title className="text-2xl">{name}</Sheet.Title>
					{(description || !!tags?.length) && (
						<Sheet.Description className="text-base">
							<ReadMore text={description} muted />

							{/*TODO: dont render tags here, but dont have time to fix now just clamped*/}
							{!!tags?.length && (
								<div className="mt-2 gap-3 flex flex-row flex-wrap">
									{tags.slice(0, 10).map((tag) => (
										<Text key={tag} size="sm" className="text-muted-foreground">
											#{tag}
										</Text>
									))}
									{tags.length > 10 && (
										<Text size="sm" className="text-muted-foreground">
											{t('common.andXMoreTrailing', { count: tags.length - 10 })}
										</Text>
									)}
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
