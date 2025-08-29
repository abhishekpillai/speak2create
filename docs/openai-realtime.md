Realtime API with WebRTC
========================

Connect to the Realtime API using WebRTC.

WebRTC is a powerful set of standard interfaces for building real-time applications. The OpenAI Realtime API supports connecting to realtime models through a WebRTC peer connection.

For browser-based speech-to-speech voice applications, we recommend starting with the Agents SDK for TypeScript, which provides higher-level helpers and APIs for managing Realtime sessions. The WebRTC interface is powerful and flexible, but lower level than the Agents SDK.

When connecting to a Realtime model from the client (like a web browser or mobile device), we recommend using WebRTC rather than WebSocket for more consistent performance.

Overview
--------

Connecting to the Realtime API via WebRTC requires a backend server that can generate an ephemeral API key that can be safely used in a client-side environment (like a browser).

The process for initializing a WebRTC connection using an ephemeral API key is as follows:

1.  A browser makes a request to a developer-controlled server to mint an ephemeral API key.
2.  The developer's server uses a [standard API key](/settings/organization/api-keys) to request an ephemeral key from the [OpenAI REST API](/docs/api-reference/realtime-sessions), and returns that new key to the browser.
3.  The browser uses the ephemeral key to authenticate a session directly with the OpenAI Realtime API as a WebRTC peer connection.

![connect to realtime via WebRTC](https://openaidevs.retool.com/api/file/55b47800-9aaf-48b9-90d5-793ab227ddd3)

Initializing a peer connection
------------------------------

In the browser, you can use standard WebRTC APIs to initialize a peer connection object. The code below requires a server-side endpoint that generates an ephemeral API token (which we'll see code for in a moment).

```javascript
// Get a session token for OpenAI Realtime API
const tokenResponse = await fetch("/token");
const data = await tokenResponse.json();
const EPHEMERAL_KEY = data.value;

// Create a peer connection
const pc = new RTCPeerConnection();

// Set up to play remote audio from the model
audioElement.current = document.createElement("audio");
audioElement.current.autoplay = true;
pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

// Add local audio track for microphone input in the browser
const ms = await navigator.mediaDevices.getUserMedia({
    audio: true,
});
pc.addTrack(ms.getTracks()[0]);

// Set up data channel for sending and receiving events
const dc = pc.createDataChannel("oai-events");

// Start the session using the Session Description Protocol (SDP)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

const baseUrl = "https://api.openai.com/v1/realtime/calls";
const model = "gpt-realtime";
const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
    },
});

const answer = {
    type: "answer",
    sdp: await sdpResponse.text(),
};
await pc.setRemoteDescription(answer);
```

The WebRTC APIs provide rich controls for handling media streams and input devices. For more guidance on building user interfaces on top of WebRTC, refer to the docs on MDN.

See the next section for details on implementing the server-side component that powers the `/token` endpoint used in the code above.

Creating an ephemeral token
---------------------------

To create an ephemeral token to use on the client-side, you will need to build a small server-side application (or integrate with an existing one) to make an [OpenAI REST API](/docs/api-reference/realtime-sessions) request for an ephemeral key. You will use a [standard API key](/settings/organization/api-keys) to authenticate this request on your backend server.

Below is an example of a simple Node.js express server which mints an ephemeral API key using the REST API:

```javascript
import express from "express";

const app = express();

const sessionConfig = JSON.stringify({
    session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: {
            output: {
                voice: "marin",
            },
        },
    },
});

// An endpoint which would work with the client code above - it returns
// the contents of a REST API request to this protected endpoint
app.get("/token", async (req, res) => {
    try {
        const response = await fetch(
            "https://api.openai.com/v1/realtime/client_secrets",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: sessionConfig,
            }
        );

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Token generation error:", error);
        res.status(500).json({ error: "Failed to generate token" });
    }
});

app.listen(3000);
```

You can create a server endpoint like this one on any platform that can send and receive HTTP requests. Just ensure that **you only use standard OpenAI API keys on the server, not in the browser.**

Sending and receiving events
----------------------------

Realtime API sessions are managed using a combination of [client-sent events](/docs/api-reference/realtime_client_events/session) emitted by you as the developer, and [server-sent events](/docs/api-reference/realtime_server_events/error) created by the Realtime API to indicate session lifecycle events.

When connecting to a Realtime model via WebRTC, you will not have to handle audio events to hear model responses in the same granular way you must with [WebSockets](/docs/guides/realtime-websocket). The WebRTC peer connection object, if configured as above, will do much of that work for you.

To send and receive other client and server events, you will use the WebRTC peer connection's data channel.

```javascript
// This is the data channel set up in the browser code above...
const dc = pc.createDataChannel("oai-events");

// Listen for server events
dc.addEventListener("message", (e) => {
    const event = JSON.parse(e.data);
    console.log(event);
});

// Send client events
const event = {
    type: "conversation.item.create",
    item: {
        type: "message",
        role: "user",
        content: [
            {
                type: "input_text",
                text: "hello there!",
            },
        ],
    },
};
dc.send(JSON.stringify(event));
```

To learn more about managing Realtime conversations, refer to the [Realtime conversations guide](/docs/guides/realtime-conversations).

[

Realtime Console

Check out the WebRTC Realtime API in this light weight example app.

](https://github.com/openai/openai-realtime-console/)

Was this page useful?
