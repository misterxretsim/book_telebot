const helpText = require('./helpText');


const controlTakeProduct = (text, type) => (text.toUpperCase().indexOf('БЕРУ') + 1) && type !== 'private';
const isAdmin = ctx => ctx.update.message.from.username === process.env.ADMIN && ctx.update.message.from.id === Number(process.env.ADMIN_ID) && ctx.update.message.chat.type === 'private';
const giveIDs = text => text.match(/\d+/gm) ? text.match(/\d+/gm).reduce((acc, current) => acc + ', ' + current) : false;
const hasCaption = caption => (caption !== undefined) && caption.match(/\d+/gm);
const isReply = ctx => ctx.update.message.reply_to_message ? ctx.update.message.reply_to_message.from.username === process.env.BOT_UN : false;
const giveReplyIDs = ctx => ctx.update.message.reply_to_message.caption ? ctx.update.message.reply_to_message.caption.match(/^id: (\d+)/)[1] : false;
const getProduct = ctx => isReply(ctx) ? giveReplyIDs(ctx) : giveIDs(ctx.update.message.text);
const getKB = ctx => isAdmin(ctx) ? [['/open_buy', '/close_buy'],['/clients', '/edit'],['/new', '/help']] : [['/info', '/help']];
const getExtra = (id, coast) => {
    return {caption: `id: ${id}\t\tЦена: ${coast}₽`};
}
const sendHelpText = ctx => {
    if (ctx.update.message.chat.type !== 'private') ctx.reply(helpText.groupRules)
    else {
       if (isAdmin(ctx)) ctx.reply(helpText.adminRules);
       else ctx.reply(helpText.lsRules);
    }
}

module.exports = { controlTakeProduct, isAdmin, getExtra, hasCaption, sendHelpText, getKB, getProduct }
