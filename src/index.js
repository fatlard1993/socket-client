import Log from 'log';

const socketClient = {
	log: new Log({ tag: 'socket-client' }),
	status: 'uninitialized',
	reconnectTime: 0,
	on: function(eventName, func){
		const eventArrName = `on_${eventName}`;

		socketClient[eventArrName] = socketClient[eventArrName] || [];

		socketClient[eventArrName].push(func);
	},
	triggerEvent: function(type, evt){
		if(!evt){
			evt = type;
			type = evt.type;
		}

		var eventName = `on_${type}`;

		if(!socketClient[eventName]) return;

		for(var x = 0, count = socketClient[eventName].length; x < count; ++x){
			socketClient[eventName][x].call(socketClient, evt);
		}
	},
	init: function(slug){
		socketClient.slug = slug;

		socketClient.ws = new WebSocket(`ws://${window.location.hostname.replace('localhost', '127.0.0.1')}:${window.location.port || 80}${slug || '/api'}`);

		socketClient.ws.addEventListener('open', function(evt){
			socketClient.log()('Connected');

			socketClient.status = 'open';

			socketClient.reconnectTime = 0;

			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('error', function(evt){
			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('message', function(evt){
			socketClient.triggerEvent(evt);

			if(evt.data){
				let data;

				try{ data = JSON.parse(evt.data); }

				catch(err){ return socketClient.log.warn()('Could not parse socket data', evt.data, err); }

				socketClient.triggerEvent(data.type, data.payload);
			}
		});

		socketClient.ws.addEventListener('close', function(evt){
			socketClient.status = 'closed';

			socketClient.triggerEvent(evt);
		});
	},
	reconnect: function(){
		if(socketClient.status === 'open') return;

		socketClient.status = 'reconnecting';

		if(socketClient.reconnection_TO) return;

		socketClient.reconnection_TO = setTimeout(function(){
			socketClient.log()('Attempting reconnection');

			socketClient.reconnection_TO = null;
			socketClient.reconnectTime += 800;

			socketClient.init(socketClient.slug);
		}, socketClient.reconnectTime);
	},
	reply: function(type, payload){
		if(socketClient.status !== 'open') return socketClient.log()(`is ${socketClient.status}`);

		socketClient.log(3)(`reply ${type} ${payload}`);

		socketClient.ws.send(JSON.stringify({ type, payload }));
	}
};

if(typeof module === 'object') module.exports = socketClient;