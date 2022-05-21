import clsx from 'clsx';
import { CheckCircle, Info, WarningCircle, WarningOctagon } from 'phosphor-react';
import React from 'react';

const icons = {
	note: Info,
	warning: WarningCircle,
	check: CheckCircle,
	danger: WarningOctagon,
};

export interface CalloutProps {
	title: string;
	icon?: keyof typeof icons;
	children: React.ReactNode;
}

export default function Callout({ title, icon = 'note', children }: CalloutProps) {
	const Icon = icons[icon];

	const borderColor = {
		'border-green-400': icon === 'check',
		'border-brand-400': icon === 'note',
		'border-amber-400': icon === 'warning',
		'border-red-400': icon === 'danger',
	};

	const iconColor = {
		'text-green-400': icon === 'check',
		'text-brand-400': icon === 'note',
		'text-amber-400': icon === 'warning',
		'text-red-400': icon === 'danger',
	};

	return (
		<div className={clsx('bg-gray-50 dark:bg-gray-700 border-l-[5px] p-4 rounded-md', borderColor)}>
			<div className="flex">
				<div className="flex-shrink-0 mt-0.5">
					<Icon className={clsx('w-5 h-5', iconColor)} weight="fill" />
				</div>
				<div className="ml-3">
					<span className="font-semibold text-gray-800 dark:text-gray-100">{title}</span>
					<div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
						<span className="flex flex-col space-y-2">{children}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
