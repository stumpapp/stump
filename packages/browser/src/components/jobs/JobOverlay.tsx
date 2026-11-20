import { useFooterOffsetStore, useJobStore } from '@stump/client'
import { cn, ProgressBar, Text } from '@stump/components'
import { JobUpdate } from '@stump/graphql'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Loader2, Minimize2 } from 'lucide-react'
import { type Ref, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

export default function JobOverlay() {
	const storeJobs = useJobStore((state) => state.jobs)
	const activeJob = useMemo(
		() => Object.values(storeJobs).find((job) => job.status === 'RUNNING'),
		[storeJobs],
	)
	const subTaskCounts = useMemo(
		() => (activeJob ? calcSubTaskCounts(activeJob) : null),
		[activeJob],
	)
	const progressValue = useMemo(() => {
		if (subTaskCounts != null && subTaskCounts.total > 0) {
			return (subTaskCounts.completed / subTaskCounts.total) * 100
		}
		return null
	}, [subTaskCounts])
	const subTaskCountString = useMemo(
		() => (subTaskCounts?.total ? `${subTaskCounts.completed ?? 0}/${subTaskCounts.total}` : null),
		[subTaskCounts],
	)

	const [isMinimized, setIsMinimized] = useState(false)
	const [expandedHeight, setExpandedHeight] = useState<number>()

	const additionalOffset = useFooterOffsetStore((state) => state.footerOffset)
	const expandedContentRef = useRef<HTMLDivElement>(null)
	const shouldReduceMotion = useReducedMotion()

	useEffect(() => {
		if (!activeJob) setIsMinimized(false)
	}, [activeJob])

	useLayoutEffect(() => {
		const content = expandedContentRef.current
		if (isMinimized || !content) return

		const nextHeight = content.offsetHeight + 34
		setExpandedHeight((currentHeight) =>
			currentHeight === nextHeight ? currentHeight : nextHeight,
		)
	}, [activeJob, isMinimized, subTaskCountString])

	return (
		<AnimatePresence>
			{activeJob && (
				<motion.div
					// @ts-expect-error: It does have className actually?
					className="group right-4 w-80 pointer-events-none fixed z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end select-none"
					role="status"
					aria-live="polite"
					// ^ TIL https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
					initial={{ opacity: 0, y: '150%' }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: '150%' }}
					transition={{
						opacity: { duration: 0.5 },
						y: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
					}}
					style={{ bottom: 16 + additionalOffset }}
				>
					<motion.div
						// @ts-expect-error: It does have className actually?
						className={cn(
							'shadow-lg pointer-events-auto relative flex max-w-[calc(100vw-2rem)] overflow-hidden border border-border bg-popover text-popover-foreground',
							isMinimized ? 'items-center justify-center' : 'gap-3 flex-col',
						)}
						initial={{ width: 320, height: 'auto', padding: 16, borderRadius: 16 }}
						animate={{
							width: isMinimized ? 48 : 320,
							height: isMinimized ? 48 : (expandedHeight ?? 'auto'),
							padding: isMinimized ? 0 : 16,
							borderRadius: isMinimized ? 24 : 16,
						}}
						transition={getPanelTransition(shouldReduceMotion)}
					>
						{isMinimized ? (
							<MinimizedJobButton
								progressValue={progressValue}
								onExpand={() => setIsMinimized(false)}
							/>
						) : (
							<ExpandedJobContent
								contentRef={expandedContentRef}
								job={activeJob}
								progressValue={progressValue}
								subTaskCountString={subTaskCountString}
							/>
						)}
					</motion.div>

					{!isMinimized && <MinimizeJobButton onMinimize={() => setIsMinimized(true)} />}
				</motion.div>
			)}
		</AnimatePresence>
	)
}

type MinimizedJobButtonProps = {
	progressValue: number | null
	onExpand: () => void
}

function MinimizedJobButton({ progressValue, onExpand }: MinimizedJobButtonProps) {
	return (
		<button
			type="button"
			className="inset-0 absolute flex size-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			aria-label="Expand job progress"
			onClick={onExpand}
		>
			<ProgressRing value={progressValue} />
			<RunningPerson />
		</button>
	)
}

const RING_RADIUS = 24
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ProgressRing({ value }: { value: number | null }) {
	const shouldReduceMotion = useReducedMotion()

	const progress = value == null ? null : Math.min(Math.max(value, 0), 100)

	return (
		<svg className="inset-0 absolute size-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
			<circle
				cx="28"
				cy="28"
				r={RING_RADIUS}
				fill="none"
				className="stroke-muted"
				strokeWidth="3"
			/>
			{progress == null && (
				<motion.circle
					cx="28"
					cy="28"
					r={RING_RADIUS}
					fill="none"
					className="stroke-primary"
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray="28 151"
					animate={shouldReduceMotion ? undefined : { rotate: 360 }}
					transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
					style={{ transformOrigin: '50% 50%' }}
				/>
			)}

			{progress != null && (
				<motion.circle
					cx="28"
					cy="28"
					r={RING_RADIUS}
					fill="none"
					className="stroke-primary"
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray={RING_CIRCUMFERENCE}
					initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
					animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress / 100) }}
					transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' }}
				/>
			)}
		</svg>
	)
}

// Note: i wanted an actual running animation but lol i am not figuring that out so it just kinda bounces
function RunningPerson() {
	const shouldReduceMotion = useReducedMotion()

	// lucide has no runner icon >:(
	return (
		<motion.svg
			className="size-5 relative text-foreground"
			viewBox="0 0 448 512"
			aria-hidden="true"
			animate={shouldReduceMotion ? undefined : { y: [0, -1.5, 0] }}
			transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
		>
			<path
				fill="currentColor"
				d="M320 48a48 48 0 1 0-96 0a48 48 0 1 0 96 0M125.7 175.5c9.9-9.9 23.4-15.5 37.5-15.5c1.9 0 3.8.1 5.6.3L137.6 254c-9.3 28 1.7 58.8 26.8 74.5l86.2 53.9l-25.4 88.8c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l28.7-100.4c5.9-20.6-2.6-42.6-20.7-53.9L238 299l30.9-82.4l5.1 12.3c15 35.8 49.9 59.1 88.7 59.1H384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-21.3c-12.9 0-24.6-7.8-29.5-19.7l-6.3-15c-14.6-35.1-44.1-61.9-80.5-73.1l-48.7-15C186.6 97.8 175 96 163.3 96c-31 0-60.8 12.3-82.7 34.3l-23.2 23.1c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l23.1-23.1zM91.2 352H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h69.6c19 0 36.2-11.2 43.9-28.5l11.5-25.9l-9.5-6a95.4 95.4 0 0 1-37.9-44.9z"
			/>
		</motion.svg>
	)
}

type ExpandedJobContentProps = {
	contentRef: Ref<HTMLDivElement>
	job: JobUpdate
	progressValue: number | null
	subTaskCountString: string | null
}

function ExpandedJobContent({
	contentRef,
	job,
	progressValue,
	subTaskCountString,
}: ExpandedJobContentProps) {
	return (
		<div
			ref={contentRef}
			className="gap-3 flex w-full flex-col"
			style={{ width: 'min(286px, calc(100vw - 4rem - 2px))' }}
		>
			<div className="gap-3 flex w-full items-start">
				<span className="mt-0.5 shrink-0 text-muted-foreground">
					<Loader2 className="size-4 animate-spin" aria-hidden="true" />
				</span>
				<div className="min-w-0 gap-1 flex flex-1 flex-col">
					<Text size="sm" className="font-medium line-clamp-2">
						{job.message ?? 'Job in progress'}
					</Text>
					{job.subtitle && (
						<Text size="sm" className="line-clamp-1 text-muted-foreground">
							{job.subtitle}
						</Text>
					)}
				</div>
				{subTaskCountString && (
					<Text size="xs" className="mt-0.5 shrink-0 text-muted-foreground tabular-nums">
						{subTaskCountString}
					</Text>
				)}
			</div>

			<div className="pl-7 w-full">
				<ProgressBar
					value={progressValue}
					size="sm"
					variant="primary"
					isIndeterminate={progressValue == null}
				/>
			</div>
		</div>
	)
}

function MinimizeJobButton({ onMinimize }: { onMinimize: () => void }) {
	return (
		<button
			type="button"
			className="-left-2 -top-2 size-7 shadow pointer-events-auto absolute z-10 flex items-center justify-center rounded-full border border-border bg-popover text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			aria-label="Minimize job progress"
			onClick={onMinimize}
		>
			<Minimize2 className="size-3.5" aria-hidden="true" />
		</button>
	)
}

function getPanelTransition(shouldReduceMotion: boolean | null) {
	const duration = shouldReduceMotion ? 0 : 0.32
	const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

	return {
		width: { duration, ease },
		height: { duration, ease },
		padding: { duration, ease },
		borderRadius: { duration, ease },
	}
}

// TODO(cleanup): rename to calcTaskCounts once consolidated
const calcSubTaskCounts = ({ completedSubtasks, totalSubtasks }: JobUpdate) => {
	if (totalSubtasks == null) return null
	return {
		completed: completedSubtasks ?? 0,
		total: totalSubtasks,
	}
}
