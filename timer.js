const correctPin = '7834';

const duration = 15 * 60 * 1000;

const state = {
	timeLeft: duration,
	paused: true,
	won: false,
	lost: false,
};

let tick = 0;
let lastTs = (new Date()).getTime();

const sockets = [];

// Timer controller
function startController(socket) {
	socket.on('start', () => {
		state.paused = false;
	});

	socket.on('reset', () => reset(socket));

	socket.on('pause', () => {
		state.paused = true;
	});
}

function reset(socket) {
	state.timeLeft = duration;
	state.paused = true;
	state.won = false;
	state.lost = false;

	tick = 0;

	socket.broadcast.emit('reset');
}

// Player input
function startPlayer(socket) {
	socket.on('pin', data => {
		// If game state is already lost or won, don't do anything
		if (state.won || state.lost) {
			return;
		}

		if (`${data}` !== correctPin) {
			return socket.emit('incorrect');
		}

		state.won = true;

		socket.emit('won');
		socket.broadcast.emit('won');
	});
}

function timerUpdateCycle() {
	const ts = (new Date()).getTime();

	tick = ts - lastTs;

	lastTs = ts;

	if (state.paused || state.won) {
		return;
	}

	state.timeLeft -= tick;
	state.timeLeft = Math.max(0, state.timeLeft);
}

function checkGameLost() {
	if (state.timeLeft > 0) {
		return;
	}

	if (state.won || state.lost) {
		return;
	}

	state.lost = true;
	sockets.forEach(socket => socket.emit('lost'));
}

// Timer Synchronization
function emitTimerSync(socket) {
	socket.emit('sync', state);
}

// Returns interval Id
function startTimeSync(socket) {
	return setInterval(() => emitTimerSync(socket), 1000 / 30);
}

module.exports = io => {
	setInterval(() => {
		timerUpdateCycle();
		checkGameLost();
	}, 1000 / 30);

	io.on('connection', function(socket){
		// Add reference for server-intiated events
		sockets.push(socket);

		startController(socket);
		startPlayer(socket);

		const intervalId = startTimeSync(socket);

		// Remove reference on disconnect
		socket.on('disconnect', () => {
			const i = sockets.indexOf(socket);
			sockets.splice(i, 1);
			clearInterval(intervalId);
		});
	});
}
