const expect = require('chai').expect
const sinon = require('sinon')
const EventEmitter = require('events')
const ChluIPFS = require('chlu-ipfs-support')
const ChluCollector = require('../src')

describe('Chlu Collector', () => {
    
    let chluIpfs, collector

    beforeEach(() => {
        chluIpfs = {
            events: new EventEmitter(),
            constants: ChluIPFS,
            orbitDb: {
                getDID: sinon.stub().resolves()
            },
            readReviewRecord: sinon.stub().resolves(),
            pin: sinon.stub().resolves(),
            broadcast: sinon.stub().resolves()
        }
        collector = new ChluCollector(chluIpfs)
    })
    
    it('pins customer DIDs')
    it('pins vendor DIDs')
    it('pins marketplace DIDs')
    it('pins VM Public Keys from PoPRs')
    it('pins review records')
    it('broadcasts replicated (done) event')
    it('broadcasts replicating (in progress) event')
})