import { Button, ButtonOrLink, DropdownMenu } from '@stump/components'
import { BookOpen, ChevronDown, EyeOff, FileText } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useTranslate } from '@/hooks/useTranslate'

import { BookReadingActionsRef, useBookReadingActions } from './useBookReadingActions'

type Props = {
	fragment: BookReadingActionsRef
}

export function BookReadActions({ fragment }: Props) {
	const navigate = useNavigate()

	const { translate } = useTranslate()
	const { isReading, isPreviouslyCompleted, links } = useBookReadingActions(fragment)

	const primaryLabel = isReading
		? translate('shared.common.continue')
		: isPreviouslyCompleted
			? translate('shared.common.readAgain')
			: translate('shared.common.read')

	return (
		<div className="gap-2 flex w-full items-center">
			<ButtonOrLink href={isReading ? links.resume : links.fromBeginning} className="flex-1">
				{primaryLabel}
			</ButtonOrLink>

			<DropdownMenu
				align="end"
				trigger={
					<Button variant="outline" size="icon" className="size-9">
						<ChevronDown />
					</Button>
				}
				groups={[
					{
						items: [
							{
								label: translate('shared.bookActions.readFromBeginning'),
								leftIcon: <BookOpen />,
								onClick: () => navigate(links.fromBeginning),
							},
							{
								label: translate('shared.bookActions.readIncognito'),
								leftIcon: <EyeOff />,
								onClick: () => navigate(links.incognito),
							},
							...(links.nativePdf
								? [
										{
											label: translate('shared.bookActions.openNativePdf'),
											leftIcon: <FileText />,
											onClick: () => navigate(links.nativePdf ?? ''),
										},
									]
								: []),
						],
					},
				]}
			/>
		</div>
	)
}
