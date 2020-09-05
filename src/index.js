const Extra = require('telegraf/extra')
const Telegraf = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();


class CustomContext extends Telegraf.Context {
    constructor (update, telegram, options) {
        console.log('Creating context for %j', update)
        super(update, telegram, options)
    }
}


let id = 1000;
const bot = new Telegraf(process.env.BOT_API, { contextType: CustomContext });
const db = new sqlite3.Database('telebot');

bot.on('text', (ctx) => {

    if ((ctx.update.message.text.toUpperCase().indexOf('БЕРУ') + 1) && ctx.update.message.chat.type !== 'private') {

        const id = ctx.update.message.text.substr(-4);                                        //id заказа
        const username = ctx.update.message.from.username;                                          //@ клиента
        const name = ctx.update.message.from.first_name + ' ' + ctx.update.message.from.last_name;  //имя клиента
        const msg = `${name}(@${username}) берёт заказ(ы): ${id}`;
        bot.telegram.sendMessage(process.env.LS_ID, msg);
    }
});

bot.on('photo', (ctx) => {

    console.log(ctx.update.message.photo)
    if (ctx.update.message.from.username === process.env.ADMIN && ctx.update.message.from.id === Number(process.env.ADMIN_ID) && ctx.update.message.chat.type === 'private') {

        const extra = Extra.markup();
        extra.caption = id;
        bot.telegram.sendPhoto(process.env.CHAT_ID, ctx.update.message.photo[2].file_id, extra);
        id++;
    }
});


bot.launch();
