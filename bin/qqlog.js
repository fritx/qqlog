#!/usr/bin/env node
var QQ = require('wqq')
var prompt = require('prompt')
var express = require('express')
var async = require('async')
var clc = require('cli-color')
var _ = require('lodash')
var debug = require('debug')('qqlog')

var qq = new QQ()
var port = 8990
prompt.start({
  message: ' ',
  delimiter: ' '
})
var inConsole = false
var msgQueue = []

var gray = clc.blackBright
var red = clc.red
var green = clc.green
var yellow = clc.yellow
var cyan = clc.cyan
var magenta = clc.magenta

async.waterfall([
  function (next) {
    prompt.get(['account'], function (e, d) {
      if (!d) return exit()
      qq.getVcode(d.account, function (e, buffer) {
        next(e, buffer)
      })
    })
  },
  function (buffer, next) {
    if (!buffer) {
      return prompt.get({
        properties: {
          password: { hidden: true }
        }
      }, next)
    }
    var app = express()
    app.get('/', function (req, res) {
      res.type('image/jpeg').send(buffer)
    })
    app.listen(port, function(e) {
      console.log(yellow('访问 http://localhost:' + port + ' 查看验证码'))
      prompt.get({
        properties: {
          vcode: true,
          password: { hidden: true }
        }
      }, next)
    })
  }
], function (e, d) {
  if (!d) return exit()
  qq.login(d.password, d.vcode, function (e, d) {
    qqReady(d)
  })
})

function qqReady(d) {
  if (!d) {
    console.log(red('登录失败'))
    return exit()
  }
  qq.getSelfInfo(function (e, d) {
    console.log(green('登录成功') + ' ' + magenta(d.nick))
    qq.on('disconnect', function () {
      exit()
    })
    qq.on('message', function (d) {
      outputMsg(d)
    })
    qq.startPoll()
  })
}

function outputMsg(m) {
  debug('接收消息', m)
  var str = _.compact([
    gray(timeStr(m.time * 1000)),
    m.group_name ? cyan(m.group_name.trim()) :
      m.discu_name ? cyan(m.discu_name.trim()) :
      gray('私聊'),
    magenta(('' + (m.send_gnick || m.send_mark ||
      m.send_nick || m.send_account || '-')).trim()) ,
    gray(m.content.map(function (chunk) {
      if (typeof chunk === 'string') return chunk.replace(/[\r\n]+/g, '  ')
      if (chunk[0] === 'face') return mapFace(chunk[1])
      if (chunk[0] === 'cface') return '::' + chunk[1] + '::'
    }).join('').replace(/\s+$/, ''))
  ]).join('  ')
  console.log(str)
}

function exit() {
  console.log(clc.bol(-1))
  process.exit()
}

function mapFace(n) {
  return ':' + n + ':'
}
function timeStr(t) {
  return new Date(t).toString().match(/\d+:\d+/)[0]
}
