import createMainStore, { Provider } from './mainStore';

interface Props {
	children: React.ReactNode;
}

export default function MainStoreProvider({ children }: Props) {
	return <Provider createStore={createMainStore}>{children}</Provider>;
}
