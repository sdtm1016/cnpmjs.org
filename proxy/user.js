/**!
 * cnpmjs.org - proxy/user.js
 *
 * Copyright(c) cnpmjs.org and other contributors.
 * MIT Licensed
 *
 * Authors:
 *  fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

'use strict';
/* jshint -W032 */

/**
 * Module dependencies.
 */

var thunkify = require('thunkify-wrap');
var utility = require('utility');
var config = require('../config');
var mysql = require('../common/mysql');
var multiline = require('multiline');

function passwordSha(password, salt) {
  return utility.sha1(password + salt);
}

var INSERT_USER_SQL = 'INSERT INTO user SET ?';
exports.add = function (user, callback) {
  var roles = user.roles || [];
  try {
    roles = JSON.stringify(roles);
  } catch (e) {
    roles = '[]';
  }
  var rev = '1-' + utility.md5(JSON.stringify(user));

  var now = new Date();

  var arg = {
    rev: rev,
    name: user.name,
    email: user.email,
    salt: user.salt,
    password_sha: user.password_sha,
    ip: user.ip,
    roles: roles,
    gmt_create: now,
    gmt_modified: now
  };

  mysql.query(INSERT_USER_SQL, [arg], function (err) {
    callback(err, {rev: rev});
  });
};

var UPDATE_USER_SQL = multiline(function () {;/*
  UPDATE
    user
  SET
    ?
  WHERE
    name=? AND rev=?;
*/});
exports.update = function (user, callback) {
  var rev = user.rev || user._rev;
  var revNo = Number(rev.split('-', 1));
  if (!revNo) {
    var err = new Error(rev + ' format error');
    err.name = 'RevFormatError';
    err.data = {user: user};
    return callback(err);
  }
  revNo++;
  var newRev = revNo + '-' + utility.md5(JSON.stringify(user));
  var roles = user.roles || [];
  try {
    roles = JSON.stringify(roles);
  } catch (e) {
    roles = '[]';
  }

  var arg = {
    rev: newRev,
    email: user.email,
    salt: user.salt,
    password_sha: user.password_sha,
    ip: user.ip,
    roles: roles,
    gmt_modified: new Date()
  };

  mysql.query(UPDATE_USER_SQL, [arg, user.name, rev], function (err, data) {
    if (err) {
      return callback(err);
    }
    callback(null, {rev: newRev, result: data});
  });
};
