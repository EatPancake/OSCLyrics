import osc from "osc";

const udpPort = new osc.UDPPort({
  localAddress: "127.0.0.1",
  localPort: 9001,
  remoteAddress: "127.0.0.1",
  remotePort: 9000,
});

udpPort.open();

udpPort.on("ready", () => {
  console.log("OSC UDP Port is ready");
});

export function sendChatbox(message, silent) {
  if (message.length < 3) {
    return;
  }
  udpPort.send(
    {
      address: "/chatbox/input",
      args: [
        { type: "s", value: message },
        { type: "i", value: 1 },
        { type: "i", value: silent },
      ],
    },
    "127.0.0.1",
    9000,
  );
}
