const correctPin = '7834';

const duration = 15 * 60 * 1000;
const maxTries = 2;

const initState = {
	timeLeft: duration,
	paused: true,
	won: false,
	lost: false,
	tries: 0,
	maxTries: maxTries
};

let state = Object.assign({}, initState);

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
	state = Object.assign({}, initState);

	tick = 0;

	socket.broadcast.emit('reset');
}

// Player input
function startPlayer(socket) {
	socket.on('pin', data => {
		const pin = `${data}`;

		if (pin.length < 4) {
			socket.emit('incorrect');
			return;
		}

		// If game state is already lost or won, don't do anything
		if (state.won || state.lost) {
			return;
		}

		if (pin !== correctPin) {
			state.tries += 1;

			if (state.tries < maxTries) {
				return socket.emit('incorrect');
			} else {
				return loseGame();
			}
		}

		winGame();
	});
}

function timerUpdateCycle() {
	const ts = (new Date()).getTime();

	tick = ts - lastTs;

	lastTs = ts;

	if (state.paused || state.won || state.lost) {
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

	loseGame();
}

function winGame() {
	state.won = true;
	emitGlobal('won');
}

function loseGame() {
	state.lost = true;
	emitGlobal('lost');
}

function emitGlobal(eventName) {
	sockets.forEach(socket => socket.emit(eventName));
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
