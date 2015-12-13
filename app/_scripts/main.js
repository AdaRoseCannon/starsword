'use strict';

const context = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
const loader = require('webaudio-buffer-loader');
const buffers = ['./audio/hum.wav', './audio/on.wav', './audio/off.wav', './audio/smash.wav'];

const loadedAudio = new Promise((resolve, reject) => {
	loader(buffers, context, 
		(err, loadedBuffers) => {
			return err ? reject(err) : resolve(loadedBuffers);
		}
	);
});

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
   window.location.protocol = "https:";
}

(function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				navigator.serviceWorker.register('./sw.js')
				.then(function(reg) {
					console.log('sw registered', reg);
				})
				.then(resolve);
			}
		} else {
			console.error('No Service Worker, assets may not be cached');
			resolve();
		}
	});
})();

// ios won't play any sound until this is done
function unlockIOSSound() {

	// create empty buffer
	var buffer = context.createBuffer(1, 1, 22050);
	var source = context.createBufferSource();
	source.buffer = buffer;

	// connect to output (your speakers)
	source.connect(context.destination);

	// play the file
	source.start(0);
}

function createSource(buffer) {
	const source = context.createBufferSource();

	// Create a gain node.
	const gainNode = context.createGain();
	source.buffer = buffer;

	// Connect source to gain.
	source.connect(gainNode);

	// Connect gain to destination.
	gainNode.connect(context.destination);

	return {
		source: source,
		gainNode: gainNode
	};
}

loadedAudio
.then(function([humBuffer, onBuffer, offBuffer, smashBuffer]) {	
	function StarSword(color = '#2FF923') {

		let hum, on, off, activated = false;
		let doppler = 0;


		Object.defineProperty(this, 'activated', {
			get() { return activated; }
		});

		Object.defineProperty(this, 'color', {
			get() { return color; }
		});

		let maxD = 0;
		let minD = 0;
		let prevD = 0;

		this.on = function () {

			if (hum) return;

			activated = true;

			on = createSource(onBuffer);
			off = createSource(offBuffer);
			hum = createSource(humBuffer);

			hum.source.loop = true;
			on.source.start();
			on.source.onended = () => {

				// The audio may have been stopped
				if (hum) {
					hum.source.start();
				}
			};
		};

		this.off = function () {

			if (!hum) return;

			activated = false;
			try {
				on.source.stop();
				hum.source.stop();
			} catch (e) {
				console.log(e);
			}
			on = undefined;
			hum = undefined;

			off.source.start();
			off.source.onended = function () {
				off = undefined;
			};

		};

		this.smash = function () {
			createSource(smashBuffer).source.start();
		};

		window.addEventListener('devicemotion', event => {
			prevD = doppler;
			doppler = Math.sqrt(Math.pow(event.acceleration.x, 2) + Math.pow(event.acceleration.y, 2) + Math.pow(event.acceleration.z, 2));
			if (doppler > maxD) maxD = doppler;
			if (doppler < minD) minD = doppler;
			if (hum) {
				hum.source.playbackRate.value = Math.max(Math.min(Math.pow(1.3, doppler - prevD), 2), 0.8);
				if (doppler > 40) {
					this.smash();
				}
			}
		});
		
		// rotation

	}

	return StarSword;
})
.then(StarSword => {
		
	const starsword = new StarSword();

	document.querySelector('.onButton')
	.addEventListener('click', function () {

		unlockIOSSound();

		if (starsword.activated) {
			starsword.off();
		} else {
			starsword.on();
		}
	});
})
.catch(e => console.log(e));
