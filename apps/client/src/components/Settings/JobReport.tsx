import React from 'react';
import { useJobReport } from '~hooks/useJobReport';

export default function JobReport() {
	const jobs = useJobReport();

	console.log(jobs);

	return <div></div>;
}
