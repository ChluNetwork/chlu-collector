const expect = require('chai').expect
const sinon = require('sinon')
const EventEmitter = require('events')
const ChluIPFS = require('chlu-ipfs-support')
const logger = require('chlu-ipfs-support/tests/utils/logger')
const ChluCollector = require('../src')

describe('Chlu Collector', () => {
    
    let chluIpfs, collector

    const fakeDidMultihash = 'Qmdid'
    const fakeMultihash = 'Qmdata'
    const fakeDidId = 'did:chlu:fake'

    beforeEach(async () => {
        chluIpfs = {
            events: new EventEmitter(),
            logger: logger('Collector'),
            constants: ChluIPFS,
            orbitDb: {
                getDID: sinon.stub().resolves({ multihash: fakeDidMultihash })
            },
            readReviewRecord: sinon.stub().resolves(),
            broadcast: sinon.stub().callsFake(async msg => chluIpfs.events.emit('mock/message-written', msg)),
            isPinned: sinon.stub().resolves(false)
        }
        chluIpfs.pin = sinon.stub().callsFake(async multihash => chluIpfs.events.emit('chlu-ipfs/pinned', multihash))
        collector = new ChluCollector(chluIpfs)
        await collector.start()
    })

    describe('reactivity to discover events', () => {
        
        it('pins customer DIDs', done => {
            expect(chluIpfs.orbitDb.getDID.called).to.be.false
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.orbitDb.getDID.calledWith(fakeDidId)).to.be.true
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('discover/did/customer', fakeDidId)
        })

        it('pins vendor DIDs', done => {
            expect(chluIpfs.orbitDb.getDID.called).to.be.false
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.orbitDb.getDID.calledWith(fakeDidId)).to.be.true
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('discover/did/vendor', fakeDidId)
        })

        it('pins marketplace DIDs', done => {
            expect(chluIpfs.orbitDb.getDID.called).to.be.false
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.orbitDb.getDID.calledWith(fakeDidId)).to.be.true
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('discover/did/marketplace', fakeDidId)
        })

        it('pins other DIDs', done => {
            expect(chluIpfs.orbitDb.getDID.called).to.be.false
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.orbitDb.getDID.calledWith(fakeDidId)).to.be.true
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('discover/did', fakeDidId)
        })

        it('pins pre-fetched DIDs from orbit-db', done => {
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                expect(chluIpfs.orbitDb.getDID.called).to.be.false
                done()
            })
            chluIpfs.events.emit('discover/did', fakeDidId, fakeDidMultihash, { id: fakeDidId })
        })

        it('pins VM Public Keys from PoPRs', done => {
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('discover/keys/vendor-marketplace', fakeMultihash)
        })

        it('pins pre-fetched review records from orbit-db', done => {
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
                expect(chluIpfs.readReviewRecord.called).to.be.false
                done()
            })
            chluIpfs.events.emit('discover/reviewrecord', fakeMultihash, { errors: [], resolved: true })
        })

    })

    describe('reactivity to pubsub requests', () => {
        it('fetches and pins review records from pubsub', done => {
            expect(chluIpfs.pin.called).to.be.false
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
                expect(chluIpfs.readReviewRecord.calledWith(fakeMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('pubsub/message', { multihash: fakeMultihash, type: ChluIPFS.eventTypes.wroteReviewRecord })
        })
    })

    describe('pinning of orbit-db data', () => {

        it('pins oplog entries while loading', done => {
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('db/load/progress', null, fakeMultihash)
        })

        it('pins oplog entries while replicating', done => {
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
                done()
            })
            chluIpfs.events.emit('db/replicate/progress', null, fakeMultihash)
        })
    })

    describe('broadcast of messages', () => {

        it('broadcasts replicated notification', done => {
            const address = 'mydb'
            chluIpfs.events.on('mock/message-written', msg => {
                expect(msg.type).to.equal(ChluIPFS.eventTypes.replicated)
                expect(msg.address).to.equal(address)
                done()
            })
            chluIpfs.events.emit('db/replicated', address)
        })

        it('broadcasts replicated (done) event', done => {
            chluIpfs.events.on('chlu-ipfs/pinned', () => {
                expect(chluIpfs.pin.calledWith(fakeDidMultihash)).to.be.true
                expect(chluIpfs.orbitDb.getDID.called).to.be.false
                done()
            })
            chluIpfs.events.emit('discover/did', fakeDidId, fakeDidMultihash, { id: fakeDidId })
        })

    })

    describe('pinning process', () => {
        
        it('checks if the content is already pinned before pinning', async () => {
            expect(chluIpfs.pin.called).to.be.false
            expect(chluIpfs.isPinned.called).to.be.false
            await collector.pinner(fakeMultihash)
            expect(chluIpfs.isPinned.calledWith(fakeMultihash)).to.be.true
            expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.true
            chluIpfs.pin.resetHistory()
            chluIpfs.isPinned = sinon.stub().resolves(true)
            await collector.pinner(fakeMultihash)
            expect(chluIpfs.isPinned.calledWith(fakeMultihash)).to.be.true
            expect(chluIpfs.pin.calledWith(fakeMultihash)).to.be.false
        })

    })
})