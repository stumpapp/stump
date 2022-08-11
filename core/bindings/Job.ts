export type JobStatus = 'Running' | 'Completed' | 'Failed';

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
