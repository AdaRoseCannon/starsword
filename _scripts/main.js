/*global performance*/
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

		Object.defineProperty(this, 'activated', {
			get() { return activated; }
		});

		Object.defineProperty(this, 'color', {
			get() { return color; }
		});

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

		let vx=0, vy=0, vz=0, t=0;
		window.addEventListener('devicemotion', event => {

			const nt = (performance ? performance.now() : Date.now());
			if (t) {
				const dt = (nt - t)/1000;
				vx *= 0.8; // Hack to allow velocity to settle
				vy *= 0.8;
				vz *= 0.8;
				vx += event.acceleration.x * dt;
				vy += event.acceleration.y * dt;
				vz += event.acceleration.z * dt;
			}
			t = nt;

			// For detecting sudden stops
			const acceleration = Math.sqrt(Math.pow(event.acceleration.x, 2) + Math.pow(event.acceleration.y, 2) + Math.pow(event.acceleration.z, 2));
			let distort = Math.sqrt(vx*vx + vy*vy + vz*vz);
			distort =  Math.pow(1.2, distort);

			if (hum) {
				hum.source.playbackRate.value = distort;
				hum.gainNode.gain.value = 1/Math.pow(distort, 2);
				if (acceleration > 25) {
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

	const handle = document.querySelector('.handle');

	document.querySelector('.onButton')
	.addEventListener('click', function () {

		unlockIOSSound();

		if (starsword.activated) {
			starsword.off();
			handle.classList.remove('on');
		} else {
			starsword.on();
			handle.classList.add('on');
		}
	});
})
.catch(e => console.log(e));
