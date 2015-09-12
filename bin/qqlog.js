#!/usr/bin/env node
var QQ = require('wqq')
var qqface = require('qqface')
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
      qq.getVcode(d.account || '', function (e, buffer) {
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
  qq.login(d.password || '', d.vcode || '', function (e, d, errmsg) {
    qqReady(d, errmsg)
  })
})

function qqReady(d, errmsg) {
  if (!d) {
    console.log(red(errmsg || '登录信息不正确，或需要关闭设备锁？'))
    console.log(red('了解更多 https://github.com/fritx/qqlog'))
    return exit()
  }
  qq.getSelfInfo(function (e, d) {
    console.log(green('登录成功') + ' ' + magenta(d.nick))
    qq.on('disconnect', function () {
      console.log(red('连接已断开 请重新登录'))
    })
    qq.on('kick', function () {
      console.log(red('您的帐号在另一地点登录，您被迫下线。'))
      console.log(red('如果这不是您本人的操作，那么您的密码很可能已泄露。'))
      exit()
    })
    qq.on('message', function (d) {
      outputMsg(d)
    })
    qq.startPoll()
  })
}

function outputMsg(m) {
  debug('显示消息', m)
  var nick = m.send_gnick || m.send_mark || m.send_nick
  var str = _.compact([
    gray(m.time ? timeStr(m.time * 1000) : m.timestr),
    m.group_name ? cyan(m.group_name.trim()) :
      m.discu_name ? cyan(m.discu_name.trim()) :
      gray('私聊'),
    nick ? magenta(nick.trim()) :
      m.anonymous ? gray('匿名') :
      m.send_account ? gray(('' + m.send_account).trim()) :
      gray('-'),
    m.file ? gray('::::' + m.file + '::::') :
      gray(m.content.map(function (chunk) {
        if (typeof chunk === 'string') {
          return chunk.replace(/\s*[\r\n]+\s*/g, '↵ ')
        }
        if (chunk[0] === 'face') return mapFace(chunk[1])
        if (chunk[0] === 'cface') return '::' + chunk[1] + '::'
      }).join(' ').trim() || '-')
  ]).join('  ')
  console.log(str)
}

function exit() {
  //console.log(clc.bol(-1))
  process.exit()
}

function mapFace(n) {
  return '[' + qqface.textFromCode(n) + ']'
}
function timeStr(t) {
  return new Date(t).toString().match(/\d+:\d+/)[0]
}
