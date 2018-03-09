var media = require('./media');
require('./code_editor');
var Peer = require('simple-peer');
var Socket = require('simple-websocket');

// let socket2 = require('socket.io');
// let socket = new socket2();
// var io = require('socket.io');
// var socket = io();
// var socket = io.connect();
// let Socket = require('socket.io');
// var socket = io.connect();
// var socket = Socketio connect('http://localhost:3000');

// let socket = io('http://localhost:3000');
var socket = new Socket({ url: 'ws://' + window.location.host });

var $chat = document.querySelector('form.text');
var $count = document.querySelector('.count');
var $history = document.querySelector('.history');
var $next = document.querySelector('.next');
var $send = document.querySelector('.send');
var $textInput = document.querySelector('.text input');
var $videoLocal = document.querySelector('video.local');
var $videoRemote = document.querySelector('video.remote');
let worker;

function disableUI() {
  $textInput.disabled = true;
  $send.disabled = true;
  // $next.disabled = true
}

function enableUI() {
  $textInput.disabled = false;
  $send.disabled = false;
  $next.disabled = false;
  $textInput.focus();
}

disableUI();

function addChat(text, className) {
  var node = document.createElement('div');
  node.textContent = text;
  node.className = className;
  $history.appendChild(node);
}

function clearChat() {
  $history.innerHTML = '';
}

var peer, stream;

socket.on('error', function(err) {
  console.error('[socket error]', err.stack || err.message || err);
});

socket.on('connect', function() {
  addChat('Please grant access to your webcam. Remember to smile!', 'status');
  media.getUserMedia(function(err, s) {
    if (err) {
      window.alert('You must share your webcam to use this app!');
    } else {
      stream = s;
      media.showStream($videoLocal, stream);
      next();
    }
  });
});

function next(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  // if (peer) {
  //   socket.send(JSON.stringify({ type: 'end' }));
  //   peer.close();
  // }
  socket.send(JSON.stringify({ type: 'peer' }));

  disableUI();
  clearChat();
  addChat('Finding a peer...', 'status');
}

$next.addEventListener('click', next);

function handlePeer(data) {
  data = data || {};

  peer = new Peer({
    initiator: !!data.initiator,
    stream: stream,
    config: {
      iceServers: [
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'codesmith',
          username: 'USER_1'
        }
      ]
    }
  });

  peer.on('error', function(err) {
    console.error('peer error', err.stack || err.message || err);
  });

  peer.on('connect', function() {
    clearChat();
    addChat('Connected, say hello!', 'status');
    enableUI();
  });

  peer.on('signal', function(data) {
    socket.send(JSON.stringify({ type: 'signal', data: data }));
  });

  peer.on('stream', function(stream) {
    media.showStream($videoRemote, stream);
  });

  peer.on('data', function(message) {
    addChat(message, 'remote');
  });

  // Takes ~3 seconds before this event fires when peerconnection is dead (timeout)
  peer.on('close', next);
}

function handleSignal(data) {
  peer.signal(data);
}

function handleCount(data) {
  $count.textContent = data;
}

socket.on('data', function(message) {
  console.log('got socket message: ' + message);
  try {
    message = JSON.parse(message);
  } catch (err) {
    console.error('[socket error]', err.stack || err.message || err);
  }

  if (message.type === 'signal') {
    handleSignal(message.data);
  } else if (message.type === 'count') {
    handleCount(message.data);
  } else if (message.type === 'end') {
    next();
  } else if (message.type === 'peer') {
    handlePeer(message.data);
  } else if (message.type === 'send code change') {
    updateEditor(message.data);
  }
});

$chat.addEventListener('submit', send);
$send.addEventListener('click', send);

function send(event) {
  event.preventDefault();
  var text = $textInput.value;
  addChat(text, 'local');
  peer.send(text);
  $textInput.value = '';
}

//////////////////////////////////////////////

console.log('========= IM INSIDE CODE_EDITOR.JS ===========', socket);
// helper function for xmlHttpRequest();
function getURL(url, c) {
  var xhr = new XMLHttpRequest();
  xhr.open('get', url, true);
  xhr.send();
  xhr.onreadystatechange = function() {
    if (xhr.readyState != 4) return;
    if (xhr.status < 400) return c(null, xhr.responseText);
    var e = new Error(xhr.responseText || 'No response');
    e.status = xhr.status;
    c(e);
  };
}

// tern - addon that brings autocomplete functionality
getURL('http://ternjs.net/defs/ecmascript.json', function(err, code) {
  if (err) throw new Error('Request for ecmascript.json: ' + err);
  server = new CodeMirror.TernServer({ defs: [JSON.parse(code)] });
  editor.setOption('extraKeys', {
    'Ctrl-Space': function(cm) {
      server.complete(cm);
    },
    'Cmd-Space': function(cm) {
      server.complete(cm);
    },
    'Ctrl-I': function(cm) {
      server.showType(cm);
    },
    'Ctrl-O': function(cm) {
      server.showDocs(cm);
    },
    'Alt-.': function(cm) {
      server.jumpToDef(cm);
    },
    'Alt-,': function(cm) {
      server.jumpBack(cm);
    },
    'Ctrl-Q': function(cm) {
      server.rename(cm);
    },
    'Ctrl-.': function(cm) {
      server.selectName(cm);
    }
  });
  editor.on('cursorActivity', function(cm) {
    server.updateArgHints(cm);
  });
});

// CodeMirror
let editor = CodeMirror(document.querySelector('#editor'), {
  value:
    '// Type JavaScript here and click "Run Code" \n \nconsole.log("Hello, world!");',
  mode: 'javascript',
  lineNumbers: true,
  indentWithTabs: true,
  indentUnit: 4,
  matchBrackets: true,
  autoCloseBrackets: true,
  foldGutter: true,
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
  lint: {
    esversion: 6
  },
  styleActiveLine: true
});

// Event Handler for editor changes
editor.on('change', cMirror => {
  const code = cMirror.getValue();
  console.log(code);

  socket.send(JSON.stringify({ type: 'send code change', data: code }));

  // socket.send('send code change', code);
  console.log('changed changed changed');
});

//   socket.onmessage = function(msg) {
//     console.log('WE RECEIVED A MESSAGE === ', msg);
//   };

socket.on('send code change', updateEditor);

function updateEditor(data) {
  console.log('HERE HERE HERE');
  const code = editor.getValue();
  if (code !== data) {
    editor.getDoc().setValue(data);
  }
}

// Event Handler for "Run Code"
document.querySelector('#run-code').addEventListener('click', e => {
  const con = `const console = { log: function (callback) { if (typeof callback === 'function') callback = callback.toString(); return postMessage(callback);}};`;
  const code = editor.getValue();

  const s = `onmessage = (e) => {
          try {
              eval(e.data);
          }
          catch (error) {
             let errorName = '';
             const regExp = /\\d+:\\d+/gi;
             const errorLine = error.stack.match(regExp)[1];
             const lineNum = parseInt(errorLine);
             if (error instanceof ReferenceError) {
               errorName = 'ReferenceError';
               postMessage(errorName + ' on line ' + lineNum + ': ' + error.message); 
             } 
             else if (error instanceof SyntaxError) {
               errorName = 'SyntaxError';
              postMessage(errorName + ': ' + error.message); 
             }
             else if (error instanceof TypeError) {
               errorName = 'TypeError';
               postMessage(errorName + ' on line ' + lineNum + ': ' + error.message); 
             }
          }
  };`;

  const newBlob = new Blob([s], { type: 'text/javascript' });
  const blobURL = URL.createObjectURL(newBlob);
  if (worker) worker.WorkerLocation = blobURL;
  if (!worker) worker = new Worker(blobURL);

  worker.postMessage(`${con}${code}`);
  document.querySelector('#results').innerHTML = '';

  worker.onmessage = function(e) {
    const li = document.createElement('li');

    if (typeof e.data === 'string') {
      li.textContent = `'${e.data}'`;
    } else if (Array.isArray(e.data)) {
      li.textContent = JSON.stringify(e.data, null, ' ');
    } else if (typeof e.data === 'object') {
      const text = JSON.stringify(e.data, null, ' ').replace(/\"(\w+)\":/g, '$1:');
      li.textContent = text;
    } else {
      li.textContent = `${e.data}`;
    }
    document.querySelector('#results').appendChild(li);
  };
  // worker.terminate();
});

window.onbeforeunload = function() {
  socket.onclose = function() {};
  socket.close();
  worker.terminate();
};
