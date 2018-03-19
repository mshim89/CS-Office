// THIS FILE RENDERS THE CODE EDITOR, VIDEO, AND CHAT
import React, { Component } from 'react';
import Video from './Video.jsx';
import { ChatApp } from './ChatApp/index.jsx';
import CodeEditor from './CodeEditor.jsx';
import io from 'socket.io-client';
import './../css/office.css';

const socketUrl = 'http://localhost:3000/';
class Office extends Component {
  constructor(props) {
    super(props);

    this.state = {
      socket: null,
    };
    this.initSocket = this.initSocket.bind(this);
  }

  componentWillMount() {
    this.initSocket();
  }

  /*
	*	Connect to and initializes the socket.
	*/
  initSocket() {
    const socket = io(socketUrl);
    socket.on('connect', () => {
      console.log('Connected Socket in Client');
    });
    this.setState({ socket });
  }

  render() {
    const { socket } = this.state;
    return (
      <div className="Office-container">
        <div className="Video-container">
          <Video socket={socket} />
        </div>
        <div className="code-chat-container">
          <CodeEditor />
          <ChatApp socket={socket} />
        </div>
      </div>
    );
  }
}

export default Office;
