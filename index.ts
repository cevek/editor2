/// <reference path="typings/node/node.d.ts" />
'use strict';

var co = require('co');
var koa = require('koa');
var router = require('koa-router')();
var cors = require('koa-cors');
var app = koa();
app.experimental = true;
import {db} from './db';

router.get('/', async function () {
    this.body = 'Hello World!';
});

router.get('/api/addtextlines', async function () {
    var data = this.request;

    var transaction = await db.beginTransaction();
    await transaction.query(db.insertSql('lines', data.lines));
    await transaction.query(db.insertSql('textLines', data.textLines));
    await transaction.commit();

    this.body = {status: "ok"};
});

app.use(cors({credentials: true}));
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3700);

app.on('error', function (err:Error) {
    console.error(err.stack);
});
console.log("serving localhost:3700");

