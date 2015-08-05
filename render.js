"use strict"

var dgram = require('dgram')


var OP_INIT               = 0xA1
  , OP_FILL_RECT          = 0xA2
  , OP_FILL_RECT_BITMAP   = 0xA3
  , OP_COPY_RECT          = 0xA4
  , OP_SET_RECT_BITMAP    = 0xA5
  , OP_SET_RECT           = 0xA6
  , OP_UNKNOWN_A7         = 0xA7
  , OP_SET_MOUSE_BOUND    = 0xA8
  , OP_SET_MOUSE_CURSOR   = 0xA9
  , OP_SET_MOUSE_POSITION = 0xAA
  , OP_SET_KEY_LOCK       = 0xAB
  , OP_UNKNOWN_AC         = 0xAC
  , OP_UNKNOWN_AD         = 0xAD
  , OP_PADDING            = 0xAF
  , OP_AUDIO              = 0xB1
  , OP_TEST               = 0xD1
  , OP_GET_VERSION        = 0xD8


function op(opcode, seq, x, y, width, height, data) {
	var ophdr = Buffer(12)
	data = data || Buffer(0)
	ophdr.writeUInt8(opcode,     0)
	ophdr.writeUInt8(0,          1) // hflags
	ophdr.writeUInt16BE(seq,     2)
	ophdr.writeUInt16BE(x,       4)
	ophdr.writeUInt16BE(y,       6)
	ophdr.writeUInt16BE(width,   8)
	ophdr.writeUInt16BE(height, 10)
	return Buffer.concat([ophdr, data])
}

function init() {
	return op(OP_INIT, 1, 0, 0, 1, 1)
}

function fillRect(seq, x, y, width, height, r, g, b) {
	return op(OP_FILL_RECT, seq, x, y, width, height, Buffer([0xFF, b, g, r]))
}

function fillRectBitmap(seq, x, y, width, height, buf) {
	return op(OP_FILL_RECT_BITMAP, seq, x, y, width, height, buf)
}

function setMouseBound(seq, x, y, width, height) {
	var data = Buffer(8)
	data.writeUInt16BE(x,      0)
	data.writeUInt16BE(y,      2)
	data.writeUInt16BE(width,  4)
	data.writeUInt16BE(height, 6)
	return op(OP_SET_MOUSE_BOUND, seq, x, y, width, height, data)
}

function Render() {
	this.client = dgram.createSocket("udp4")
	this.client.on('message', function(msg, rinfo) {
		console.log('UDP', msg)
	})

	this.seq_num = 0
}

Render.prototype.send = function(buf) {
	this.seq_num += 1
	var hdr = Buffer(8)
	hdr.writeUInt16BE(this.seq_num, 0) // seq_num
	hdr.writeUInt16BE(0, 2)            // flags
	hdr.writeUInt16BE(0, 4)            // atype
	hdr.writeUInt16BE(0, 6)            // direction
	
	var msg = Buffer.concat([hdr, Buffer([0,0,0,0,0,0,0,0]), buf])
	console.log(msg, msg.length)
	this.client.send(msg, 0, msg.length, this.ray_port, this.ray_host)
}

Render.prototype.run = function(host, port, width, height) {
	var self = this
	this.ray_host = host
	this.ray_port = port
	console.log('RNDR', host, port, width, height)

	self.send(init())
	self.send(setMouseBound(0, 0, 0, width, height))
	self.send(fillRect(0, 0,      0, width, height / 2,   0, 128, 0))
	self.send(fillRect(1, 0, height / 2, width, height,     128, 128, 0))

	setInterval(function() {
		self.send(fillRect(0, 0,      0, width, height / 2,   0, 128, 0))
		self.send(fillRect(1, 0, height / 2, width, height,     128, 128, 0))
		self.send(fillRect(0, self.seq_num % 300, 200, 600, 600, 0, 0, 255))
	}, 200)

}

module.exports = Render