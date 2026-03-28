import {StrictMode} from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const STRICT_MODE_ENABLED = import.meta.env.VITE_STRICT_MODE === 'true';

ReactDOM.createRoot(document.getElementById('root')!).render(
	STRICT_MODE_ENABLED ? (
		<StrictMode>
			<App />
		</StrictMode>
	) : (
		<App />
	),
);
