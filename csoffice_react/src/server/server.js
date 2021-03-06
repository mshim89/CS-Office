//  REQUIRED
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const hat = require('hat');
const ws = require('ws');
const bodyParser = require('body-parser');
const logger = require('morgan');
const cookieParser = require('cookie-parser');

//  FILES
const users = require('./api/users');
const auth = require('./auth/index');

//  EXPRESS
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//  MONGOOSE
mongoose.connection.once('open', () => {
  console.log('===CONNECTED TO DATABASE===');
});

// LOGGER
app.use(logger('dev'));

// COOKIES
app.use(cookieParser('process.env.COOKIE_SECRET'));
app.use('/auth', auth);
app.use('/api/users', users);

//  PATH FOR STATIC FILES
app.use(express.static(`${__dirname}./../../`));
app.use('/css', express.static(path.join(__dirname, './../client/css')));
app.use('/public', express.static(path.join(__dirname, './../client/public')));

app.get('*', (request, response) => {
  response.sendFile(path.resolve(__dirname, './../../index.html'));
});

// ERROR HANDLERS
// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  // render the error page if in production hide the stack trace
  res.json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {},
  });
});

const PORT = process.env.PORT || 3000;

//  SOCKETS
const server = require('http').Server(app);
const io = (module.exports.io = require('socket.io')(server));

const SocketManager = require('./SocketManager');

io.on('connection', SocketManager);

// var socket = io.listen(server);
// socket.on('connection', function(client) {
//   console.log('connection established on server')
// })

server.listen(PORT, () => console.log('===SERVER LISTENING ON PORT 3000==='));
// module.exports = io;

// //////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////
// var wsServer = new ws.Server({ server: server });
// var peers = {};
// var waitingId = null;
// var count = 0;

// socket.on('connection', onconnection);

// //PEER IS WEBSOCKET AND WE ASSIGN IT AN ID AND PEERID
// function onconnection(peer) {
//   console.log('===SOCKET CONNECTED FROM SERVER===');
//   var send = peer.send;
//   peer.send = function() {
//     try {
//       send.apply(peer, arguments);
//     } catch (err) {}
//   };

//   peer.id = hat(); //CREATE UNIQUE ID 'THIS.ID'
//   peers[peer.id] = peer; //SET PEERS OBJECT WITH PEER.ID AND PEER (WEBSOCKET)
//   peer.on('close', onclose.bind(peer));
//   peer.on('error', onclose.bind(peer));
//   peer.on('message', onmessage.bind(peer));
//   count += 1;
//   broadcast(JSON.stringify({ type: 'count', data: count }));
// }

// function onclose() {
//   peers[this.id] = null;
//   if (this.id === waitingId) {
//     waitingId = null;
//   }
//   if (this.peerId) {
//     var peer = peers[this.peerId];
//     peer.peerId = null;
//     peer.send(JSON.stringify({ type: 'end' }), onsend);
//   }
//   count -= 1;
//   broadcast(JSON.stringify({ type: 'count', data: count }));
// }

// //DATA ENCAPSULATES WEBRTC OFFER, ANSWER, OR ICE CANDIDATE
// //'THIS' REFERS TO PEER1 (WEBSOCKET)
// function onmessage(data) {
//   // console.log('[' + this.id + ' receive] ' + data + '\n');
//   try {
//     var message = JSON.parse(data);
//   } catch (err) {
//     console.error('Discarding non-JSON message: ' + err);
//     return;
//   }

//   if (message.type === 'peer') {
//     if (waitingId && waitingId !== this.id) {
//       //IF WAITING ID IS TRUE AND DOES NOT EQUAL PEER1'S ID THEN ASSIGN WAITINGID TO peer
//       var peer = peers[waitingId];

//       this.peerId = peer.id;
//       peer.peerId = this.id;

//       //send peer1 as the initiator
//       this.send(
//         JSON.stringify({
//           type: 'peer',
//           data: {
//             initiator: true
//           }
//         }),
//         onsend
//       );

//       //send peer
//       peer.send(
//         JSON.stringify({
//           type: 'peer'
//         }),
//         onsend
//       );

//       waitingId = null;
//     } else {
//       waitingId = this.id;
//     }
//   } else if (message.type === 'signal') {
//     //SEND ICE CANDIDATE, OFFER, AND ANSWER (MESSAGE.DATA)
//     if (!this.peerId) return console.error('unexpected `signal` message');
//     var peer = peers[this.peerId];
//     peer.send(JSON.stringify({ type: 'signal', data: message.data }));
//     console.log('=== SENDING ICE, OFFER, OR ANSWER ===', message);
//   } else if (message.type === 'end') {
//     if (!this.peerId) return console.error('unexpected `end` message');
//     var peer = peers[this.peerId];
//     peer.peerId = null;
//     this.peerId = null;
//     peer.send(JSON.stringify({ type: 'end' }), onsend);
//   } else if (message.type === 'send code change') {
//     console.log('=== ON CODE CHANGE MESSAGE SERVER.JS=== ', message);

//     wsServer.clients.forEach(function each(client) {
//       if (client !== peer) {
//         client.send(JSON.stringify({ type: 'send code change', data: message.data }));
//       }
//     });
//   } else {
//     peer.send(message, onsend);
//     console.error('unknown message `type` ' + message.type);
//   }
// }

// function onsend(err) {
//   if (err) console.error(err.stack || err.message || err);
// }

// function broadcast(message) {
//   for (var id in peers) {
//     var peer = peers[id];
//     if (peer) {
//       peer.send(message);
//     }
//   }
// }
