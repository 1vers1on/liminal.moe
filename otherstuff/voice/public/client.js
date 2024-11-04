const startButton = document.getElementById('startButton');

let localStream;
let pc;
let ws = new WebSocket(`wss://${window.location.host}`);

ws.onmessage = async function(event) {
  let message = JSON.parse(event.data);
  if (message.offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
    let answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ answer: pc.localDescription }));
  } else if (message.answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
  } else if (message.iceCandidate) {
    try {
      await pc.addIceCandidate(message.iceCandidate);
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  }
};

startButton.onclick = async function() {
  pc = new RTCPeerConnection();

  pc.onicecandidate = function(event) {
    if (event.candidate) {
      ws.send(JSON.stringify({ iceCandidate: event.candidate }));
    }
  };

  pc.ontrack = function(event) {
    let audio = document.createElement('audio');
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    let offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ offer: pc.localDescription }));
  } catch (err) {
    console.error(err);
  }
};