// includes log
// babel
/* global log */

const socketClient = {
	status: 'uninitialized',
	reconnectTime: 1200,
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

		socketClient.ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port || 80}${slug || '/api'}`);

		socketClient.ws.addEventListener('open', function(evt){
			socketClient.status = 'open';

			socketClient.reconnectTime = 1500;

			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('error', function(evt){
			socketClient.triggerEvent(evt);
		});

		socketClient.ws.addEventListener('message', function(evt){
			socketClient.triggerEvent(evt);
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
			log('[socketClient] Attempting reconnection... ');

			socketClient.reconnection_TO = null;
			socketClient.reconnectTime += 800;

			socketClient.init(socketClient.slug);
		}, socketClient.reconnectTime);
	},
	reply: function(type, payload){
		if(socketClient.status !== 'open') return log(`[socketClient] is ${socketClient.status}`);

		socketClient.ws.send(JSON.stringify({ type, payload }));
	}
};