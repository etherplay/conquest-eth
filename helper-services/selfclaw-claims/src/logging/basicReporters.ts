import {LogEvent, type Reporter} from 'workers-logger';

export const consoleReporter: Reporter = async (events: LogEvent[], context: {req: Request; res: Response}) => {
	console.log(`reporting ${events.length} events`);
	for (const event of events) {
		if (event.error) {
			console.error(event.error);
		}
		switch (event.level) {
			case 'fatal':
			case 'error':
				console.error(...event.messages);
				break;
			case 'warn':
				console.warn(...event.messages);
				break;
			case 'debug':
				console.debug(...event.messages);
				break;
			case 'info':
				console.info(...event.messages);
				break;
			case 'log':
				console.log(...event.messages);
				break;
		}
	}
};
