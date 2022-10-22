import { Button, ButtonGroup } from '@chakra-ui/react';
import { ArrowLeft, ArrowRight, DotsThree } from 'phosphor-react';
import { useMemo } from 'react';
import { useWindowSize } from 'rooks';
import PagePopoverForm from '../../components/PagePopoverForm';
import { usePagination } from '../../hooks/usePagination';
import { PaginationProps } from '../Pagination';

interface TablePaginationProps extends Omit<PaginationProps, 'position'> {
	onPageChange: (page: number) => void;
}

export default function TablePagination({
	pages,
	currentPage,
	onPageChange,
}: TablePaginationProps) {
	const { innerWidth: screenWidth } = useWindowSize();

	const numbersToShow = useMemo(() => {
		if (screenWidth != null) {
			if (screenWidth < 768) {
				return 5;
			}

			if (screenWidth < 992) {
				return 7;
			}
		}

		return 10;
	}, [screenWidth]);

	const { pageRange } = usePagination({ totalPages: pages, currentPage, numbersToShow });

	return (
		<ButtonGroup size="sm" isAttached variant="outline">
			{/* FIXME: not working?? */}
			<Button onClick={() => onPageChange(currentPage - 1)}>
				<ArrowLeft />
			</Button>

			{pageRange.map((page, i) => {
				if (typeof page === 'number') {
					return (
						<PaginationNumber
							key={`${i}, pagination-${page}`}
							active={page === currentPage}
							onClick={() => onPageChange(page)}
							page={page}
						/>
					);
				}

				return (
					<PagePopoverForm
						pos={i}
						key={`${i}, pagination-${page}`}
						totalPages={pages}
						onPageChange={onPageChange}
						trigger={
							<Button>
								<DotsThree />
							</Button>
						}
					/>
				);
			})}

			<Button isDisabled={currentPage >= pages} onClick={() => onPageChange(currentPage + 1)}>
				<ArrowRight />
			</Button>
		</ButtonGroup>
	);
}

interface PaginationNumberProps {
	page: number;
	active: boolean;
	onClick: () => void;
}

// TODO: style
function PaginationNumber({ active, onClick, page }: PaginationNumberProps) {
	return <Button onClick={onClick}>{page}</Button>;
}
