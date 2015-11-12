'use strict';
var co = require('co');
var koa = require('koa');
var router = require('koa-router')();
var app = koa();
app.experimental = true;
import {db} from './db';

router.get('/', async function (){
    this.body = 'Hello World!';
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3700);

app.on('error', function (err:Error) {
    console.error('server error', err);
});