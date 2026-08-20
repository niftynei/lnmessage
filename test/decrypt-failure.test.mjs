import assert from 'node:assert/strict'
import test from 'node:test'

import { Buffer } from 'node:buffer'
import LnMessage from '../dist/index.js'
import { BufferReader } from '../dist/messages/buf.js'
import { HANDSHAKE_STATE, READ_STATE } from '../dist/types.js'

test('authenticated decrypt failure is observable and closes the session', async () => {
  const client = new LnMessage({
    remoteNodePublicKey: '02cca6c5c966fcf61d121e3a70e03a1cd9eeeea024b26ea666ce974d43b242e636',
    ip: '127.0.0.1',
    port: 9735,
    wsProtocol: 'ws:'
  })
  let closed = false
  client.socket = { close: () => { closed = true } }
  client._handshakeState = HANDSHAKE_STATE.READY
  client._readState = READ_STATE.READY_FOR_LEN
  client._messageBuffer = new BufferReader(Buffer.alloc(18))
  client.noise.decryptLength = () => { throw new Error('bad mac') }

  const failures = []
  client.connectionErrors$.subscribe((error) => failures.push(error))

  await client._processBuffer()

  assert.equal(closed, true)
  assert.equal(failures.length, 1)
  assert.equal(failures[0].name, 'LnMessageError')
  assert.equal(failures[0].code, 'decrypt_failure')
})
