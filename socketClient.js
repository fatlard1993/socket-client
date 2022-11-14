const socketClient = {
	status: 'uninitialized',
	reconnectTime: 0,
	eventListeners: {},
	on: (eventName, func) => {
		const eventArrName = `on_${eventName}`;

		socketClient.eventListeners[eventArrName] = socketClient.eventListeners[eventArrName] || [];

		socketClient.eventListeners[eventArrName].push(func);
	},
	off: (eventName, func) => {
		const eventArrName = `on_${eventName}`;

		if (!socketClient.eventListeners[eventArrName]) return;

		socketClient.eventListeners[eventArrName] = socketClient.eventListeners[eventArrName].filter(evt => evt !== func);
	},
	clearEventListeners: eventName => {
		const eventArrName = `on_${eventName}`;

		if (eventName) socketClient.eventListeners[eventArrName] = [];
		else socketClient.eventListeners = {};
	},
	triggerEvent: (type, evt) => {
		if (!evt) {
			evt = type;
			type = evt.type;
		}

		const eventName = `on_${type}`;

		if (!socketClient.eventListeners[eventName]) return;

		for (let x = 0, count = socketClient.eventListeners[eventName].length; x < count; ++x) {
			socketClient.eventListeners[eventName][x].call(socketClient, evt);
		}
	},
	init: (slug, port) => {
		socketClient.slug = slug;
		socketClient.port = port;

		socketClient.ws = new WebSocket(`ws://${window.location.hostname.replace('localhost', '127.0.0.1')}:${port || window.location.port || 80}${slug || '/api'}`);

		socketClient.ws.addEventListener('open', evt => {
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
					return;
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
			socketClient.reconnection_TO = null;
			socketClient.reconnectTime += 800;

			socketClient.init(socketClient.slug);
		}, socketClient.reconnectTime);
	},
	stayConnected() {
		if (socketClient.status === 'open') return;

		let reload = 'soft';

		if (reload === 'soft' && socketClient.triedSoftReload) reload = 'hard';

		if (reload === 'hard') return window.location.reload(false);

		socketClient.reconnect();

		socketClient.triedSoftReload = true;

		socketClient.resetSoftReset_TO = setTimeout(() => {
			socketClient.triedSoftReload = false;
		}, 4000);
	},
	reply: (type, payload) => {
		if (socketClient.status !== 'open') return;

		socketClient.ws.send(JSON.stringify({ type, payload }));
	},
};

export default socketClient;
