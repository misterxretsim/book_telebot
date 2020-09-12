const Telegraf = require('telegraf');
const Markup = require('telegraf/markup')
const sqlite3 = require('sqlite3').verbose();
const help = require('./helpers')
require('dotenv').config();


const bot = new Telegraf(process.env.BOT_API);


bot.help(ctx => help.sendHelpText(ctx));
bot.hears('Правила', ctx => help.sendHelpText(ctx));

bot.command('info', (ctx) => {

    if (ctx.update.message.chat.type === 'private') {

        let products = [];
        const db = new sqlite3.Database('telebot.sqlite3');
        db.all(`SELECT products FROM Cart WHERE username = '${ctx.update.message.from.username}' AND status != 1;`, [], (err, rows) => {
            if (err) {
                throw err;
            } else {
                if (rows.length > 0) {
                    ctx.reply(`Вы заказали: ${rows[0].products}`);
                    const productArr = rows[0].products.match(/\d+/gm);
                    productArr.forEach((el) => {
                        db.all(`SELECT data, coast FROM Product WHERE id = '${el}';`, [], (err, rows) => {
                            if (err) {
                                throw err;
                            } else {
                                products.push({data: rows[0].data, coast: rows[0].coast, id: el});
                            }
                        });
                    });
                } else {
                    ctx.reply('В текущей закупке товаров не найдено');
                }
            }
        });
        db.close();

        setTimeout(() => {
            products.forEach(el => {
                bot.telegram.sendPhoto(ctx.update.message.from.id, el.data, {caption: `id: ${el.id}\nЦена: ${el.coast}₽`});
            });
        }, 100);
    }
});

bot.on('text', (ctx) => {

    const text = ctx.update.message.text;

    if ( help.controlTakeProduct(text, ctx.update.message.chat.type) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        const username = ctx.update.message.from.username;                                          //@ клиента
        const name = ctx.update.message.from.first_name + ' ' + ctx.update.message.from.last_name;  //полное имя клиента
        const tg_id = ctx.update.message.from.id;                                                   //телеграм_id клиента
        const product = help.giveIDs(text);                                                         //id заказа(ов)

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
            bot.telegram.sendMessage(tg_id, `Вы написали некорректное сообщение:\n"${text}"\n\nнапишите /help и сравните с примерами. Писать нужно обязательно в общий чат.`);
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

    } else if (help.controlSetCoast(text, ctx.update.message.from.username, ctx.update.message.from.id, ctx.update.message.chat.type)) {

        const db = new sqlite3.Database('telebot.sqlite3');

        db.all(`SELECT id, data FROM Product WHERE coast = 'NEED_COAST';`, [], (err, rows) => {
            if (err) {
                throw err;
            } else if (rows.length) {

                const coastArr = help.coastArr(text, rows);
                coastArr.forEach( (el, i) => {
                    db.run(`UPDATE Product SET coast = '${el}' WHERE id = ${rows[i].id};`, (err) => {
                        if (err) {
                            return console.log('Product', err.message);
                        }
                    });
                    bot.telegram.sendPhoto(process.env.CHAT_ID, rows[i].data, help.getExtra(rows[i].id, el));
                });
            }
        });
        db.close();
    }
});

bot.on('photo', (ctx) => {

    if ( help.controlPhoto(ctx.update.message.from.username, ctx.update.message.from.id, ctx.update.message.chat.type) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        const photo = ctx.update.message.photo[ctx.update.message.photo.length - 1].file_id;
        const coast = ctx.update.message.caption;

        if (help.hasCaption(coast)) {

            db.run(`INSERT INTO Product (data, coast) VALUES ('${photo}', '${coast}');`, function (err) {
                if (err) {
                    return console.log('Photo:', err.message);
                }
                const id = this.lastID;

                bot.telegram.sendPhoto(process.env.CHAT_ID, photo, help.getExtra(id, coast));
            });
        } else {

            db.run(`INSERT INTO Product (data, coast) VALUES ('${photo}', 'NEED_COAST');`, function (err) {
                if (err) {
                    return console.log('Photo:', err.message);
                }
            });
        }

        db.close();
    }
});

bot.on('callback_query', (ctx) => {
    const id = ctx.callbackQuery.data;
    ctx.answerCbQuery(`Была добавлена кнопка заказа: "Беру ${id}"`);
    ctx.reply(`@${ctx.update.callback_query.from.username}, для подтверждения заказа нажмите на "Беру ${id}" в своей клавиатуре`,
        Markup.keyboard([[`Беру ${id}`, 'Правила']]).oneTime().resize().extra()
    )
})

bot.launch();

console.log('Bot started!')
