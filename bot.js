const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '';
const bot = new TelegramBot(token, { polling: true });
var variables, url, file_path;
// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, 'Hello, World!');
// });

bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, 'you used the /echo command');
})

// GraphQL query copied from AniList API Documentation: https://anilist.gitbook.io/anilist-apiv2-docs/overview/graphql/getting-started
var query = `
query ($id: Int) { # Define which variables will be used in the query (id)
  Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
    id
    title {
      romaji
      english
      native
    }
  }
}
`;

function handleResponse(response) {
    return response.json().then(function (json) {
        return response.ok ? json : Promise.reject(json);
    });
}

function handleData(data, chatId) {
    var title = data.data.Media.title.english;
    bot.sendMessage(chatId, title);
    bot.sendMessage(chatId, 'Is this the right one?');
}

function handlePhotoData(data) {
    file_path = data.result.file_path;
}

function handleError(error) {
    console.error(error);
}

bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    // receive photo and store it somehow
    const photo_id = msg.photo[msg.photo.length-1].file_id;

    await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${photo_id}`)
    .then(handleResponse).then(handlePhotoData).catch(handleError);
})

bot.onText(/\/start/, async (msg, match) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'you used the /start command');
    
    await fetch(
        `https://api.trace.moe/search?url=${encodeURIComponent(
          `https://api.telegram.org/file/bot${token}/${file_path}`,
        )}`,
      ).then(handleResponse)
    .then(getTitle)
    .catch(handleError);

    async function getTitle(data) {
        // Define our query variables and values that will be used in the query request
        variables = {
            id: data.result[0].anilist
        };

        // Define the config we'll need for our Api request
        url = 'https://graphql.anilist.co',
            options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            };

        await fetch(url, options).then(handleResponse)
            .then((data) => {handleData(data, chatId)})
            .catch(handleError);
    }
})

