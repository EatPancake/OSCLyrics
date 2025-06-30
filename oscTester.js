const osc = require("osc");

const udpPort = new osc.UDPPort({
  localAddress: "127.0.0.1",
  localPort: 9000,
  remoteAddress: "127.0.0.1",
  remotePort: 9001,
});

udpPort.open();

udpPort.on("message", function (oscMessage) {
  console.log(oscMessage);
});
