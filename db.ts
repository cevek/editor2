/// <reference path="typings/node/node.d.ts" />
'use strict';

async function rawQuery(connection:any, query:string, params:any) {
    return await new Promise<any[]>((resolve, reject)=> {
        connection.query(query, params, (err:any, rows:any) => {
            if (err) {
                err.message = err.message + '\n' + query;
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

var mysql = require('mysql2');
import {config} from './config';
var pool = mysql.createPool({
    database: config.db.name,
    user: config.db.user,
    password: config.db.password
});

class DB {
    async query(query:string, params?:any) {
        var connection = await db.getConnection();
        var res = await rawQuery(connection, query, params);
        connection.release();
        return res;
    }

    insertSql(table:string, values:any[]) {

        var keysSet = new Set();
        for (var i = 0; i < values.length; i++) {
            for (var field in values[i]){
                keysSet.add(field);
            }
        }
        var keys = [...keysSet.values()];
        var arrValues:string[][] = [];
        for (var value of values) {
            var arrValue:string[] = [];
            for (var key of keys) {
                arrValue.push(mysql.escape(value[key]));
            }
            arrValues.push(arrValue);
        }
        return `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${arrValues.map(
            v => `${v.join(", ")}`).join("), (")});`;
    }

    async queryOne(query:string, params?:any) {
        return (await db.query(query, params))[0];
    }

    async beginTransaction():Promise<Transaction> {
        var connection = await db.getConnection();
        await new Promise((resolve, reject)=> {
            connection.beginTransaction((err:Error)=> {
                if (err) {
                    return reject(err);
                }
                resolve();
            })
        });
        return new Transaction(connection);
    }

    async getConnection():Promise<any> {
        return await new Promise((resolve, reject)=> {
            pool.getConnection((err:Error, connection:any) => {
                if (err) {
                    return reject(err);
                }
                connection.config.namedPlaceholders = true;
                resolve(connection);
            });
        });
    }
}
export const db = new DB();

class Transaction {
    constructor(public connection:any) {}

    async query(query:string, params?:any) {
        try {
            return await rawQuery(this.connection, query, params);
        }
        catch (e) {
            await this.rollback();
            throw e;
        }
    }

    async queryOne(query:string, params?:any) {
        return (await this.query(query, params))[0];
    }

    async commit() {
        return await new Promise((resolve, reject)=> {
            this.connection.commit((err:Error) => {
                if (err) {
                    this.rollback().then(()=> {
                        reject(err);
                    });
                }
                else {
                    resolve();
                }
            });
        });
    }

    async rollback() {
        return await new Promise((resolve, reject)=> {
            this.connection.rollback(() => {
                resolve();
            });
        });
    }
}


