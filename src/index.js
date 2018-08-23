const { isEmpty } = require('lodash')

class ChluCollector {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async start() {
        this.chluIpfs.logger.debug('Starting Chlu Collector')
        const self = this;
        this.handler = message => {
            return self.handleMessage(message);
        };
        this.didPinner = async (didId, multihash = null) => {
            try {
                if (multihash) {
                    this.chluIpfs.logger.debug(`Pinning pre-validated DID ${didId} at ${multihash}`);
                    await this.pinner(multihash)
                    this.chluIpfs.logger.debug(`Pinned pre-validated DID ${didId} at ${multihash}`);
                } else {
                    this.chluIpfs.logger.debug(`Fetching and validating DID ${didId}`);
                    const { multihash } = await this.chluIpfs.orbitDb.getDID(didId)
                    if (multihash) {
                        this.chluIpfs.logger.debug(`Pinning DID ${didId} at ${multihash}`);
                        await this.pinner(multihash)
                        this.chluIpfs.logger.debug(`Pinned DID ${didId} at ${multihash}`);
                    } else {
                        throw new Error(`Cannot Pin DID ${didId}: not found`)
                    }
                }
            } catch (error) {
                this.chluIpfs.logger.error(`Could not Pin DID ${didId} due to Error: ${error.message}`)
            }
        }
        this.reviewPinner = async (multihash, reviewRecord = null, bitcoinNetwork = null, bitcoinTransactionHash = null) => {
            this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + multihash);
            try {
                if (reviewRecord && reviewRecord.resolved && isEmpty(reviewRecord.errors)) {
                    this.chluIpfs.logger.debug('Pinning pre-validated ReviewRecord ' + multihash);
                    await this.pinner(multihash)
                    this.chluIpfs.logger.debug('Pinned pre-validated ReviewRecord ' + multihash);
                } else {
                    // Read review record first. This caches the content, the history, and throws if it's not valid
                    this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + multihash);
                    // TODO: this network checking logic should be moved somewhere else
                    if(!isEmpty(bitcoinNetwork) && bitcoinNetwork !== this.chluIpfs.bitcoin.getNetwork()) {
                        throw new Error(
                            'Review Record ' + multihash + ' with txId ' + bitcoinTransactionHash
                            + ' had bitcoin network ' + bitcoinNetwork
                            + ' (expected ' + this.chluIpfs.bitcoin.getNetwork() + ')'
                        );
                    }
                    await this.chluIpfs.readReviewRecord(multihash, {
                        bitcoinTransactionHash: bitcoinTransactionHash
                    });
                    this.chluIpfs.logger.debug('Pinning validated ReviewRecord ' + multihash);
                    await this.pinner(multihash);
                    this.chluIpfs.logger.info('Validated and Pinned ReviewRecord data for ' + multihash);
                }
            } catch(exception){
                this.chluIpfs.logger.error('Pinning failed due to Error: ' + exception.message);
                console.log(exception)
            }
        }
        this.pinner = async multihash => {
            try {
                if (await this.chluIpfs.isPinned(multihash)) {
                    this.chluIpfs.logger.debug(`Content already Pinned: ${multihash}`);
                } else {
                    await this.chluIpfs.pin(multihash);
                }
            } catch (error) {
                this.chluIpfs.logger.error('Service Node Pinning failed due to Error: ' + error.message);
            }
        };
        this.replicatedNotifier = async address => {
            try {
                await this.chluIpfs.broadcast({
                    type: this.chluIpfs.constants.eventTypes.replicated,
                    address
                });
                this.chluIpfs.logger.info('Database replicated');
            } catch (error) {
                this.chluIpfs.logger.warn('Could not send Service Node message due to Error: ' + error.message);
            }
        };
        this.oplogEntryPinner = async multihash => {
            this.chluIpfs.logger.debug(`Pinning OrbitDB Oplog Entry ${multihash}`)
            await this.pinner(multihash)
        }
        // Handle Chlu network messages
        this.chluIpfs.events.on('pubsub/message', this.handler);
        // Pin Review Records
        this.chluIpfs.events.on('discover/reviewrecord', this.reviewPinner)
        // Pin DIDs and public keys
        this.chluIpfs.events.on('discover/did', this.didPinner);
        this.chluIpfs.events.on('discover/did/customer', this.didPinner);
        this.chluIpfs.events.on('discover/did/issuer', this.didPinner);
        this.chluIpfs.events.on('discover/did/vendor', this.didPinner);
        this.chluIpfs.events.on('discover/did/marketplace', this.didPinner);
        this.chluIpfs.events.on('discover/keys/vendor-marketplace', this.pinner);
        // Pin OrbitDB data
        this.chluIpfs.events.on('db/load/progress', (address, hash) => this.oplogEntryPinner(hash))
        this.chluIpfs.events.on('db/replicate/progress', (address, hash) => this.oplogEntryPinner(hash))
        // Send messages on replication
        this.chluIpfs.events.on('db/replicated', this.replicatedNotifier);
        this.chluIpfs.logger.debug('Started Chlu Collector')
    }

    async stop() {
        this.chluIpfs.logger.debug('Stopping Chlu Collector')
        if (this.handler) {
            // Stop listening for messages
            this.chluIpfs.events.removeListener('pubsub/message', this.handler);
            this.handler = undefined;
        }
        this.chluIpfs.logger.debug('Stopped Chlu Collector')
    }

    async handleMessage(message) {
        let obj = message;
        // handle ReviewRecord: pin hash
        if (obj.type === this.chluIpfs.constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
            await this.reviewPinner(obj.multihash, null, obj.bitcoinNetwork, obj.bitcoinTransactionHash)
        }
    }
}

module.exports = ChluCollector;