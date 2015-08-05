#!/usr/bin/env node
"use strict"

// http://softray.sourceforge.net/ALSP

var net     = require('net')
var carrier = require('carrier')
var _       = require('underscore')
var Render  = require('./render')

function parse(parameters) {
	var ret = {}
	parameters.forEach(function(arg) {
		var s = arg.split('=')
		if(s.length == 1) {
			ret[s[0]] = 'true'
		} else {
			ret[s[0]] = s[1]
		}
	})
	return ret
}

function serialize(parameters) {
	var ret = ''
	Object.keys(parameters).forEach(function(k) {
		ret = ret + ' ' + k + '=' + parameters[k]
	})
	return ret
}

var server = net.createServer(function(conn) {
	var state  = {}
	var render = new Render()
	function reply(cmd, parameters) {
		parameters = parameters || {}
		conn.write(cmd + serialize(parameters) + '\n')
		console.log('<', cmd + serialize(parameters))
	}
	carrier.carry(conn, function parser(line) {
		var args = line.split(' ')
		var cmd  = args.shift()
		state = _.extend(state, parse(args))
		
		console.log('>', line)
		switch(cmd) {
		case 'infoReq':
			reply('connInf', {
				'useReal':     'true',
				'encUpType':   'none',
				'encDownType': 'none',
				'module':      'StartSession.m3',
				'access':      'allowed',
				'tokenSeq':    state['tokenSeq'],
				'token':       'pseudo.98f36e812f5032fe4d53f668ffd0e32d'
			})
			break
		case 'connRsp':
			// start drawing
			var ip     = Buffer(state['realIP'], 'hex').toJSON().join('.')
			var port   = state['pn']
			var res    = state['startRes'].split(':')[0].split('x')
			var height = res[0]
			var width  = res[1]
			render.run(ip, port, height, width)
			break
		case 'keepAliveReq':
			reply('keepAliveCnf')
			break
		case 'quit':
			conn.end()
			break
		default:
			console.log('Unknown command: ' + cmd)
		}
	})
}).listen(7009, '::')
