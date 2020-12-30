const Discord = require('discord.js');
const db = require('quick.db');

/*
Poll command format: 
.intopoll option1 option2 option3 option4 ...

Poll DB structure:

polls: {
  (pollMessageId): {
    question: '...',
    options: [
      { option: '...', reaction: (reactionEmoji) },
      { option: '...', reaction: (reactionEmoji) },
      ...
    ],
    votes: [
      { user: (userId), reaction: (reactionEmoji) },
      { user: (userId), reaction: (reactionEmoji) },
      { user: (userId), reaction: (reactionEmoji) },
      ...
    ]
  },
  ...
}
*/

function createPoll(msg, args) {
  const pollId = msg.id;

  if (args.length < 3) {
    msg.channel.send('A szavazásnak legalább 3 argumentuma kell legyen: a kérdés, és legalább 2 válaszlehetőség `válasz:reakció` formában!');
    return;
  }

  // Converting the question to a proper format...
  let questionIndex = 0;
  let question = '';

  for (questionIndex; !args[questionIndex].endsWith(']'); questionIndex++) {
    question += (' ' + args[questionIndex]);
  }
  question += (' ' + args[questionIndex++]);
  question = question.slice(2, question.length - 1);

  // Initializing the object in DB
  db.set(`polls[${pollId}]`, { 'question': question, 'options': [], 'votes': [] });

  // Saving reactions & answers to the database
  const options = args.slice(questionIndex, args.length);
  
  for (const option of options) {
    const optionArgs = option.split(':');
    console.log(`KEY: ${optionArgs[0]} - VALUE: ${optionArgs[1]}`);
    
    db.push(`polls[${pollId}].options`, { option: optionArgs[0], reaction: optionArgs[1] });
  }
  
  console.log('DB after vote announcement:', db.get(`polls[${pollId}]`));
  // Sending a poll message to the channel
  let pollMsg = `**SZAVAZÁS**\n${db.get(`polls[${pollId}].question`)}\n`;

  const dbOptions = db.get(`polls[${pollId}].options`);
  dbOptions.forEach(option => {
    pollMsg += `${option.option}: ${option.reaction}\n`;
  });

  // Sending the message & adding reactions to it right after that
  msg.channel.send(pollMsg).then(sentPollMsg => {
    dbOptions.forEach(option => {
      sentPollMsg.react(option.reaction);
    })
  });
}

exports.createPoll = createPoll;