import { Button, Dialog, NativeSelect, Text } from '@stump/components'
import { MergeStrategy } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'

import { useMatchActions } from '../useMatchActions'
import { useMatchReviewStore } from '../useMatchReviewStore'

export function ReviewDialogFooter() {
	const { t } = useLocaleContext()
	const { records, currentRecordIndex, strategy, nextRecord, prevRecord, setStrategy } =
		useMatchReviewStore()
	const { accept, reject, isPending, hasCandidate } = useMatchActions()

	// TODO: I can't decide if I like or hate those icons
	return (
		<Dialog.Footer className="flex items-center justify-between">
			<div className="gap-4 flex items-center">
				<div className="gap-1 flex items-center">
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						disabled={currentRecordIndex === 0}
						onClick={prevRecord}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<Text size="xs" variant="muted">
						{currentRecordIndex + 1}/{records.length}
					</Text>
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						disabled={currentRecordIndex >= records.length - 1}
						onClick={nextRecord}
					>
						<ArrowRight className="h-4 w-4" />
					</Button>
				</div>

				<NativeSelect
					options={Object.values(MergeStrategy).map((strategy) => ({
						label: t(getKey(`strategies.${strategy}`)),
						value: strategy,
					}))}
					value={strategy}
					onChange={(e) => setStrategy(e.target.value as MergeStrategy)}
					className="h-8 w-52 text-xs"
				/>
			</div>

			<div className="gap-2 flex items-center">
				<Button
					variant="destructive"
					size="sm"
					onClick={reject}
					disabled={isPending || !hasCandidate}
				>
					<X className="mr-1.5 h-3.5 w-3.5" />
					{t(getKey('reject'))}
				</Button>
				<Button size="sm" onClick={accept} disabled={isPending || !hasCandidate}>
					<Check className="mr-1.5 h-3.5 w-3.5" />
					{t(getKey('accept'))}
				</Button>
			</div>
		</Dialog.Footer>
	)
}

const LOCALE_KEY = 'metadataMatching.reviewDialog.footer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
