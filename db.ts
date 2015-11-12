'use strict';

async function rawQuery(connection:any, query:string, params:any) {
    return await new Promise<any[]>((resolve, reject)=> {
        connection.query(query, params, (err:any, rows:any) => {
            if (err) {
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

var mysql = require('mysql2');
var config = require('./config');
var pool = mysql.createPool({
    database: config.db.name,
    user: config.db.user,
    password: config.db.password
});

export const db = {
    async query(query:string, params?:any) {
        var connection = await db.getConnection();
        var res = await  rawQuery(connection, query, params);
        connection.release();
        return res;
    },

    async queryOne(query:string, params?:any) {
        return (await db.query(query, params))[0];
    },

    async beginTransaction() {
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
    },

    async getConnection(): Promise<any> {
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
};

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


