const Telegraf = require('telegraf');
const Markup = require('telegraf/markup')
const sqlite3 = require('sqlite3').verbose();
// const Scene = require('./scenes')
const help = require('./helpers')
const helpText = require('./helpText')
require('dotenv').config();


const bot = new Telegraf(process.env.BOT_API);


let flagForBuy = 1;

bot.start(ctx => {

    if (ctx.update.message.chat.type === 'private') {
        const kb = help.getKB(ctx);
        ctx.reply(
            helpText.startRules,
            Markup.keyboard(kb).resize().extra()
        )
    }
});

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

bot.command('new', ctx => {

    if ( help.isAdmin(ctx) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        db.run('UPDATE Cart SET status = 1 WHERE status = 0;', (err) => {
            if (err) {
                ctx.reply('Произошла какая-то ошибка 😣');
                return console.log('Cart', err.message);
            } else {
                ctx.reply('Вы успешно стартовали новую закупку 😉');
            }
        });
        db.close();
    }
});

bot.command('close_buy', ctx => {

    if (help.isAdmin(ctx)) {

        flagForBuy = 0;
        ctx.reply('Добавление товаров в заказ ОСТАНОВЛЕНО')
    }
});
bot.command('open_buy', ctx => {

    if (help.isAdmin(ctx)) {

        flagForBuy = 1;
        ctx.reply('Добавление товаров в заказ ЗАПУЩЕНО')
    }
});

bot.command('clients', ctx => {

    if ( help.isAdmin(ctx) ) {

        const db1 = new sqlite3.Database('telebot.sqlite3');
        let clients = [];
        let products = [];
        db1.all(`SELECT name, username, products FROM Cart WHERE status = 0;`, [], (err, rows) => {
            if (err) {
                throw err;
            }
            else if (rows.length) {
                rows.forEach(el => clients.push({name: el.name, username: el.username, products: el.products.match(/\d+/gm)}) );
            }
        });
        db1.close();

        setTimeout(() => {
            const db2 = new sqlite3.Database('telebot.sqlite3');
            clients.forEach(el => el.products.forEach( item => {
                db2.all(`SELECT data, coast FROM Product WHERE id = '${item}';`, [], (err, rows) => {
                    if (err) {
                        throw err;
                    }
                    else if (rows.length) {
                        products.push({id: item, data: rows[0].data, coast: rows[0].coast});
                    }
                });
            }));
            db2.close();
        }, 300);
        setTimeout(() => {
            clients.forEach(el => {
                el.items = []
                el.products.forEach( item => el.items.push(products.filter(product => product.id === item)[0]));
                el.total = el.items.reduce((acc, cur) => acc + Number(cur.coast), 0);
                ctx.reply(`Электронный чек для ${el.name}(@${el.username})\n\nВсего товаров(${el.products.length}):\n\n${el.items.reduce((acc, cur) => acc + ` • id: ${cur.id}, цена: ${cur.coast}₽\n`,'')}\n\nИтого к оплате: ${el.total}₽`);
            });
        },1000)
    }
});

// bot.command('client', ctx => {
//
//     if ( help.isAdmin(ctx) ) {
//
//         let products = [];
//         let client = {};
//         const db = new sqlite3.Database('telebot.sqlite3');
//         db.all(`SELECT name, username, products FROM Cart WHERE status = 0 AND username = '${ctx.update.message.text.match(/@(.*)$/m)[1]}';`, [], (err, rows) => {
//             if (err) {
//                 throw err;
//             } else if (rows.length) {
//
//                 client.name = rows[0].name;
//                 client.username = rows[0].username;
//                 client.productArr = rows[0].products.match(/\d+/gm);
//
//                 client.productArr.forEach((el) => {
//                     db.all(`SELECT data, coast FROM Product WHERE id = '${el}';`, [], (err, rows) => {
//                         if (err) {
//                             throw err;
//                         } else {
//                             products.push({data: rows[0].data, coast: rows[0].coast, id: el});
//                         }
//                     });
//                 });
//             }
//         });
//         db.close();
//
//         setTimeout(() => {
//             products.forEach(el => {
//                 bot.telegram.sendPhoto(ctx.update.message.from.id, el.data, {caption: `id: ${el.id}  Цена: ${el.coast}₽`});
//             });
//         }, 100);
//         setTimeout(() => {
//             const sum = products.reduce((acc, current) => acc + Number(current.coast), 0);
//             ctx.reply(
//                 `Электронный чек для ${client.name}(@${client.username})\n\nВсего товаров(${products.length}):\n\n${products.reduce((acc, cur) => acc + ` • id: ${cur.id}, цена: ${cur.coast}₽\n`,'')}\n\nИтого к оплате: ${sum}₽`
//             );
//         }, 500);
//     }
// });

bot.command('coast', ctx => {

     if (help.isAdmin(ctx)) {

         const coast = ctx.update.message.text.match(/\d+/gm)[0];
         const db = new sqlite3.Database('telebot.sqlite3');
         db.all(`SELECT id, data FROM Product WHERE coast = 'NEED_COAST';`, [], (err, rows) => {
             if (err) {
                 ctx.reply(`Произошла неизвсетная ошибка при вызове БД: ${err}`);
             } else if (rows.length) {

                rows.forEach( el => {

                    db.run(`UPDATE Product SET coast = '${coast}' WHERE id = ${el.id};`, (err) => {

                        if (err) {
                            ctx.reply(`Произошла неизвсетная ошибка при вызове БД: ${err}`);
                        } else {
                            bot.telegram.sendPhoto(process.env.CHAT_ID, el.data, help.getExtra(el.id, coast));
                        }
                    });
                });
            } else ctx.reply('На данный момент нет фотографий без цены 😉');
        });
        db.close();
    }
});

// bot.command('edit', ctx => {

// });

bot.on('text', ctx => {

    const text = ctx.update.message.text;

    if ( help.controlTakeProduct(text, ctx.update.message.chat.type) ) {

        const db = new sqlite3.Database('telebot.sqlite3');
        const username = ctx.update.message.from.username;                                              //@ клиента
        const tg_id = ctx.update.message.from.id;                                                       //телеграм_id клиента

        if (flagForBuy) {

            const name = ctx.update.message.from.first_name + ' ' + ctx.update.message.from.last_name;  //полное имя клиента
            const product = help.getProduct(ctx);                                                       //id заказа(ов)

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
            }
        } else {

            ctx.reply('К сожалению, на сегодня закупка уже закрыта 🙅🏼‍♀️')
        }

        db.all(`SELECT id FROM Clients WHERE username = '${username}';`, [], (err, rows) => {
            if (err) {
                throw err;
            } else if (!rows.length) {
                db.run(`INSERT INTO Clients (name, username, tg_id) VALUES ('${name}', '${username}', '${tg_id}');`, (err) => {
                    if (err) {
                        return console.log('Clients:', err.message);
                    }
                });
            }
        });
        db.close();
    }
});

bot.on('photo', ctx => {

    if ( help.isAdmin(ctx) ) {

        const photo = ctx.update.message.photo[ctx.update.message.photo.length - 1].file_id;
        const coast = ctx.update.message.caption;
        const db = new sqlite3.Database('telebot.sqlite3');

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

bot.launch();

console.log('Bot started!')
