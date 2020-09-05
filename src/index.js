const Extra = require('telegraf/extra')
const Telegraf = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_API);

bot.command(['Rules', 'rules'], (ctx) => ctx.reply(rules))
bot.on('text', (ctx) => {

    if ( controlTakeProduct(ctx.update.message.text, ctx.update.message.chat.type) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        const username = ctx.update.message.from.username;                                          //@ клиента
        const name = ctx.update.message.from.first_name + ' ' + ctx.update.message.from.last_name;  //имя клиента
        const tg_id = ctx.update.message.from.id;                                                   //телеграм_id клиента
        const product = giveIDs(ctx.update.message.text);                                           //id заказа(ов)

        if (product) {
            db.all(`SELECT id, products FROM Cart WHERE username = '${username}' AND status != 1;`, [], (err, rows) => {
                if (err) {
                    throw err;
                } else {
                    if (rows.length > 0) {
                        db.run(`UPDATE Cart SET products = '${rows[0].products + ', ' + product}' WHERE id = ${rows[0].id};`, (err) => {
                            if (err) {
                                return console.log('Cart', err.message);
                            }
                        });
                    } else {
                        db.run(`INSERT INTO Cart (name, username, products, status) VALUES ('${name}', '${username}', '${product}', 0);`, (err) => {
                            if (err) {
                                return console.log('Cart', err.message);
                            }
                        });
                    }
                }
            });

            bot.telegram.sendMessage(tg_id, `Вы только что добавили в заказ: ${product}`);

        } else {
            bot.telegram.sendMessage(tg_id, `Вы написали некорректное сообщение:\n"${ctx.update.message.text}"\n\nнапишите /rules и сравните с примерами. Писать нужно обязательно в общий чат.`);
        }

        db.all(`SELECT id FROM Clients WHERE username = '${username}';`, [], (err, rows) => {
            if (err) {
                throw err;
            } else {
                if (!rows.length) {
                    db.run(`INSERT INTO Clients (name, username, tg_id) VALUES ('${name}', '${username}', '${tg_id}');`, (err) => {
                        if (err) {
                            return console.log('Clients:', err.message);
                        }
                    });
                }
            }
        });
        db.close();
    }
});

bot.on('photo', (ctx) => {

    if ( controlPhoto(ctx.update.message.from.username, ctx.update.message.from.id, ctx.update.message.chat.type) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        const photo = ctx.update.message.photo[2].file_id;

        db.run(`INSERT INTO Product (data) VALUES ('${photo}');`, function(err) {
            if (err) {
                return console.log('Photo:', err.message);
            }
            const extra = Extra.markup();
            const id = this.lastID;
            const coast = ctx.update.message.caption;
            extra.caption = `id: ${id}\nЦена: ${coast}₽`;

            bot.telegram.sendPhoto(process.env.CHAT_ID, photo, extra);
        });
        db.close();
    }
});

bot.launch();

const controlTakeProduct = (text, type) => (text.toUpperCase().indexOf('БЕРУ') + 1) && type !== 'private';
const controlPhoto = (username, id, type) => username === process.env.ADMIN && id === Number(process.env.ADMIN_ID) && type === 'private';
const giveIDs = (text) => text.match(/\d+/gm) ? text.match(/\d+/gm).reduce((acc, current) => acc + ', ' + current) : false;
const rules =
    'Правила чата:\n' +
    '\n' +
    'Чтобы сделать заказ,\n' +
    'Вам нужно написатьв общий чат:\n' +
    '"Беру *номер(а) заказа(ов)*";\n' +
    '\n' +
    'Например:\n' +
    '"Беру 1001", "Аня, беру 100, 101 и 1001"\n' +
    '\n' +
    'Иные варианты бот, к сожалению, НЕ воспринимает. Если все прошло успешно, бот отправит Вам личное сообщение.';
