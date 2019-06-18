"use strict";

var name;
var connectedUser;
const socket = io();

navigator.getUserMedia = ( navigator.getUserMedia || navigator.mediaDevices.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

socket.on('connect', () => console.log("Connected to signalling server"));

socket.on('message', (msg) => {
    console.log("Got message: ", msg);

    try {
        let data = msg
        switch(data.type){
            case "login": handleLogin(data.success); break;
            case "offer": handleOffer(data.offer, data.name); break;
            case "answer": handleAnswer(data.answer); break;
            case "candidate": handleCandidate(data.candidate); break;
            case "leave": handleLeave(); break;
            default: break;
        }
    } catch (error) {
        console.log(error, JSON.stringify(msg))
    }

});

socket.on('error', (error) => console.log(error));

function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    socket.emit('message', JSON.stringify(message));
}

// UI SELECTORS

const loginPage = document.querySelector('#loginPage');
const usernameInput = document.querySelector('#usernameInput');
const loginBtn = document.querySelector('#loginBtn');

const callPage = document.querySelector('#callPage');
const callToUsernameInput = document.querySelector('#callToUsernameInput');
const callBtn = document.querySelector('#callBtn');

const hangUpBtn = document.querySelector('#hangUpBtn');

const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');

var yourConn;
var stream;

callPage.style.display = "none";

loginBtn.addEventListener('click', (event) =>{
    name = usernameInput.value;
    if (name.length > 0) {
        send({
            type: "login",
            name: name
        });
    }
});

function handleLogin(success) {
    if (success === 'false') {
        alert("Try a different username!");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        navigator.getUserMedia({video: true, audio: true}, (myStream) =>{
            stream = myStream;
            // let track = stream.getVideoTracks()[0];
            localVideo.srcObject = stream;

            // let configuration = {
            //     "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
            // };
            let configuration = {
                iceServers:[
                {urls: ["turn:173.194.72.127:19305?transport=udp",
                   "turn:[2404:6800:4008:C01::7F]:19305?transport=udp",
                   "turn:173.194.72.127:443?transport=tcp",
                   "turn:[2404:6800:4008:C01::7F]:443?transport=tcp"
                   ],
                 username:"CKjCuLwFEgahxNRjuTAYzc/s6OMT",
                 credential:"u1SQDR/SQsPQIxXNWQT7czc/G4c="
                },
                {urls:["stun:stun.l.google.com:19302"]}
              ]};

            yourConn = new RTCPeerConnection(configuration);

            yourConn.addStream(stream);

            yourConn.onaddstream = (e) => {
                remoteVideo.srcObject = e.stream;
            }

            yourConn.onicecandidate = (e) => {
                if (e.candidate) {
                    send({
                        type: "candidate",
                        candidate: e.candidate
                    });
                }
            }

        },(error) => console.log(error));
    }
}

callBtn.addEventListener('click', () => {
    let callToUsername = callToUsernameInput.value;

    if (callToUsername.length > 0) {
        connectedUser = callToUsername;

        yourConn.createOffer((offer) => {
            send({type: "offer", offer: offer});
            yourConn.setLocalDescription(offer);
        },(error) => {
            alert("Error when creating an offer");
        });
    }
});

function handleOffer(offer, name) {
    connectedUser = name;
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));

    yourConn.createAnswer((answer) => {
        yourConn.setLocalDescription(answer);
        send({type: "answer", answer: answer});
    }, (error) => {
        alert("Error when creating answer!")
    });
}

function handleAnswer(answer) {
    yourConn.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
}

hangUpBtn.addEventListener('click', (event) => {
    send({type: 'leave'});
    handleLeave();
});

function handleLeave() {
    connectedUser = null;
    remoteVideo.src = null;

    yourConn.close();
    yourConn.onicecandidate = null;
    yourConn.onaddstream = null;
}
