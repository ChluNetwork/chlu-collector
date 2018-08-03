# Chlu Collector

A daemon that connects to the [Chlu](https://chlu.io) network and pins all IPFS data, making sure it stays available
after other nodes go offline.

## Usage

This module is not on NPM yet, so it has to be installed by cloning the repo and running `npm install <folder>`

You can install the module globally and use `chlu-collector start` to run it.

If you want to run it on a custom network, use `chlu-collector start --network <custom>`, otherwise it runs on the `experimental` network (used in development) by default.

The only other network in use is the `staging` network, used by our official demo at [demo.chlu.io](https://demo.chlu.io)

### Using programmatically

The Chlu Module is exported by default, so you when you use `require('chlu-collector')` that is what you get.

To see how it is integrated into [ChluIPFS](https://github.com/ChluNetwork/chlu-ipfs-support), check out the `src/bin.js` file.

### Running Offline

You can start the  with `chlu-collector start --offline`. Other apps using [ChluIPFS](https://github.com/ChluNetwork/chlu-ipfs-support) on the same
machine should detect the service node in offline mode and enter offline mode as well, making sure all of your Chlu
apps on your machine will talk to each other even if you are completely disconnected.
