const http = require('http');
const Koa = require('koa');
const serve = require('koa-static');
const socketIO = require('socket.io');
const timer = require('./timer');

const app = new Koa();

// Static
app.use(serve('./public'));

app.server = http.createServer(app.callback());
app.listen = (...args) => {
	app.server.listen.call(app.server, ...args);
	return app.server;
};

// IO
app.io = socketIO(app.server, {});

timer(app.io);

// Listener
app.listen(80);

console.log('Timer at http://localhost:80');
console.log('Controller at http://localhost:80/controller.html');
