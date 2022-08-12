export type JobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'QUEUED';

// FIXME: this is not really correct. This is a JobUpdate really, not a Job.
// Too tired to fix this now, ideally I want to try and find something like
// https://docs.rs/ts-rs/latest/ts_rs/ so I don't have to continue doing this...
export interface Job {
	runnerId: string;
	status: JobStatus;
	currentTask: number;
	taskCount: number;
	message?: string;
}

export type JobEventKind =
	| 'JobStarted'
	| 'JobProgress'
	| 'JobComplete'
	| 'JobFailed'
	| 'CreatedMedia'
	| 'CreatedSeries';

// FIXME: this type is bad...
export type JobEvent = {
	[kind in JobEventKind]: any;
};

export interface JobReport {
	id: string | null;
	kind: string;
	details: string | null;
	status: JobStatus;
	taskCount: number | null;
	completedTaskCount: number | null;
	secondsElapsed: number | null;
	completedAt: Date | null;
}
