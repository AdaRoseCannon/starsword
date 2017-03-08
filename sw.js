/* global self, toolbox, importScripts */
/* jshint browser:true */
'use strict';

importScripts('vendor/sw-toolbox.js');

const RESOURCES_CACHE_NAME = 'my-cache-v1';

self.addEventListener('install', function(event) {
	console.log('Installing service worker');
	if (typeof event.replace !== 'undefined') {
		event.replace();
	}
});

toolbox.precache([
	'index.html',
	'audio/hum.wav',
	'audio/off.wav',
	'audio/on.wav',
	'audio/smash.wav',
	'scripts/main.js',
	'styles/main.css'
]);

const defaultRoute = (location.protocol === 'http:' || location.hostname === 'localhost') ? toolbox.networkFirst : toolbox.fastest;
toolbox.router.default = function(request, values, options) {

	values = values || {};
	options = options || {};

	options.cache = RESOURCES_CACHE_NAME;
	if ((new URL(request.url)).protocol.match(/^http/)) {
		return defaultRoute(request, values, options);
	} else {
		return toolbox.networkFirst(request, values, options);
	}
};
