import { Log } from 'log';

const log = new Log({ tag: 'socket-client' });

const socketClient = {
	log,
	status: 'uninitialized',
	reconnectTime: 0,
	on: (eventName, func) => {
		const eventArrName = `on_${eventName}`;

		socketClient[eventArrName] = socketClient[eventArrName] || [];

		socketClient[eventArrName].push(func);
	},
	triggerEvent: (type, evt) => {
		if (!evt) {
			evt = type;
			type = evt.type;
		}

		const eventName = `on_${type}`;

		if (!socketClient[eventName]) return;

		for (let x = 0, count = socketClient[eventName].length; x < count; ++x) {
			socketClient[eventName][x].call(socketClient, evt);
		}
	},
	init: slug => {
		socketClient.slug = slug;

		socketClient.ws = new WebSocket(`ws://${window.location.hostname.replace('localhost', '127.0.0.1')}:${window.location.port || 80}${slug || '/api'}`);

		socketClient.ws.addEventListener('open', evt => {
			log()('Connected');

			socketClient.status = 'open';

			socketClient.reconnectTime = 0;

			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('error', evt => {
			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('message', evt => {
			socketClient.triggerEvent(evt);

			if (evt.data) {
				let data;

				try {
					data = JSON.parse(evt.data);
				} catch (err) {
					return log.warn()('Could not parse socket data', evt.data, err);
				}

				socketClient.triggerEvent(data.type, data.payload);
			}
		});

		socketClient.ws.addEventListener('close', evt => {
			socketClient.status = 'closed';

			socketClient.triggerEvent(evt);
		});
	},
	reconnect: () => {
		if (socketClient.status === 'open') return;

		socketClient.status = 'reconnecting';

		if (socketClient.reconnection_TO) return;

		socketClient.reconnection_TO = setTimeout(() => {
			log()('Attempting reconnection');

			socketClient.reconnection_TO = null;
			socketClient.reconnectTime += 800;

			socketClient.init(socketClient.slug);
		}, socketClient.reconnectTime);
	},
	reply: (type, payload) => {
		if (socketClient.status !== 'open') return log()(`is ${socketClient.status}`);

		log(3)(`reply ${type} ${payload}`);

		socketClient.ws.send(JSON.stringify({ type, payload }));
	},
};

export default socketClient;
