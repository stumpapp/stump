type JobStatus = 'Running' | 'Completed' | 'Failed';

interface Job {
	runnerId: string;
	status: JobStatus;
	currentTask: number;
	taskCount: number;
	message?: string;
}

type JobEventKind =
	| 'JobStarted'
	| 'JobProgress'
	| 'JobComplete'
	| 'JobFailed'
	| 'CreatedMedia'
	| 'CreatedSeries';

type JobEvent = {
	[kind in JobEventKind]: any;
};
