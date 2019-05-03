const socket = io();
let state = {};

const $clock = document.getElementById('timer');
const $body = document.getElementById('body');

const $button = {
	start: document.getElementById('start'),
	pause: document.getElementById('pause'),
	reset: document.getElementById('reset'),
};

const $input = document.getElementById('input');

const sounds = {
	clock: new Audio('audio/tick-tock.mp3'),
	won: new Audio('audio/ta-da.mp3'),
	lost: new Audio('audio/sad-trombone.mp3'),
};

const wonTemplate = `
	<p class="popup-title">YOU WON</p>
	<p class="popup-subtitle">Assasination stopped!</p>
`;

const lostTemplate = `
	<p class="popup-title">GAME OVER</p>
	<p class="popup-subtitle">Assasination signal sent!</p>
`;

function makeNode(string) {
	const div = document.createElement('div');
	div.innerHTML = string.trim();

	return div.firstChild;
}

function formatTime(ms) {
	return (new Date(ms)).toISOString().substr(14, 5);
}

function update() {
	// Update timer
	$clock.innerHTML = formatTime(state.timeLeft);

	updateGameStatePopup('won', wonTemplate);
	updateGameStatePopup('lost', lostTemplate);

	if ($input) {
		if (state.lost || state.won) {
			$input.disabled = true;
		} else {
			$input.disabled = false;
		}
	}
}

function updateGameStatePopup(stateName, contents) {
	let $popup = document.getElementById(`popup-${stateName}`);

	if (state[stateName]) {
		// Add state popup if not already present
		if (!$popup) {
			$body.appendChild(makeNode(`
				<div class="popup ${stateName}" id="popup-${stateName}">
					<div class="popup-inner">
						${contents}
					</div>
				</div>
			`));
		}

		// Add state classname to BODY
		if (!$body.classList.contains(stateName)) {
			$body.classList.add(stateName);
		}
	} else {
		// Remove state popup if present
		if ($popup) {
			$body.removeChild($popup);
			$popup = null;
		}

		// Remove state classname from BODY
		if ($body.classList.contains(stateName)) {
			$body.classList.remove(stateName);
		}
	}
}

function reset() {
	if ($input) {
		$input.value = '';
	}
}

function player(soundName) {
	sounds[soundName].loop = false;

	return () => {
		sounds[soundName].play();
		sounds[soundName].loop = false;
	}
}

// Events
socket.on('sync', serverState => {
	state = serverState;

	update();
});

socket.on('reset', reset);
socket.on('won', player('won'));
socket.on('lost', player('lost'));

// Controller UI
if ($button.start) {
	$button.start.addEventListener('click', event => {
		socket.emit('start');
	});

	$button.pause.addEventListener('click', event => {
		socket.emit('pause');
	});

	$button.reset.addEventListener('click', event => {
		socket.emit('reset');
	});
}

// Player UI
if ($input) {
	$input.addEventListener('keyup', event => {
		if (event.which !== 13) {
			return true;
		}

		socket.emit('pin', event.target.value);
	});
}
