const helpText = require('./helpText')

const controlTakeProduct = (text, type) => (text.toUpperCase().indexOf('БЕРУ') + 1) && type !== 'private';
const controlSetCoast = (text, username, id, type) => text.match(/[a-zA-Z]+/gm) === null && text.match(/\d+/gm) && controlPhoto(username, id, type);
const controlPhoto = (username, id, type) => username === process.env.ADMIN && id === Number(process.env.ADMIN_ID) && type === 'private';
const giveIDs = text => text.match(/\d+/gm) ? text.match(/\d+/gm).reduce((acc, current) => acc + ', ' + current) : false;
const hasCaption = caption => (caption !== undefined) && caption.match(/\d+/gm);
const coastArr = (text, rows) => text.match(/\d+/gm).length > rows.length ? text.match(/\d+/gm).filter((a, i) => i < rows.length) : text.match(/\d+/gm);
const getExtra = (id, coast) => {
    return {"reply_markup":{"inline_keyboard":[[{"text":`Беру ${id}`,"callback_data":id,"hide":false}]]}, caption: `id: ${id}\t\tЦена: ${coast}₽`};
}
const sendHelpText = ctx => {
    if (ctx.update.message.chat.type !== 'private') {
        ctx.reply(helpText.groupRules);
    } else {
        if (controlPhoto(ctx.update.message.from.username, ctx.update.message.from.id, ctx.update.message.chat.type)) ctx.reply(helpText.adminRules);
        else ctx.reply(helpText.lsRules);
    }
}

module.exports = { controlTakeProduct, controlPhoto, giveIDs, getExtra, hasCaption, controlSetCoast, coastArr, sendHelpText }