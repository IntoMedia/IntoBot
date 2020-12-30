const Discord = require('discord.js');
const db = require('quick.db');

/*
Poll command format: 
.intopoll [question] option1:emoji1 option2:emoji2 ..

Poll DB structure:

latestPoll: (pollMessageId),
polls: {
  (pollMessageId): {
    botMsg: (botMessageId),
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

  const latestPoll = db.get('latestPoll');
  if (latestPoll != null) {
    msg.channel.send('Még nem zártad le a legutóbbi szavazást! Ezt a `.intopollstop` paranccsal teheted meg!');
    return;
  }

  if (args.length < 3) {
    msg.channel.send('A szavazásnak legalább 3 argumentuma kell legyen: a kérdés, és legalább 2 válaszlehetőség `válasz:reakció` formában! Példa:\n```.intopoll [Kérdés, szögletes zárójelek között] igen:😄 nem:😦```');
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
  db.set('latestPoll', pollId);
  db.set(`polls[${pollId}]`, { 'question': question, 'options': [], 'votes': [] });

  // Saving reactions & answers to the database
  const options = args.slice(questionIndex, args.length);
  
  for (const option of options) {
    const optionArgs = option.split(':');
    db.push(`polls[${pollId}].options`, { option: optionArgs[0], reaction: optionArgs[1] });
  }
  
  // Sending a poll message to the channel
  let pollMsg = `**SZAVAZÁS**\n${db.get(`polls[${pollId}].question`)}\n`;

  const dbOptions = db.get(`polls[${pollId}].options`);
  dbOptions.forEach(option => {
    pollMsg += `${option.reaction} \`${option.option}\`\n`;
  });

  // Sending the message & adding reactions to it right after that
  msg.channel.send(pollMsg).then(sentPollMsg => {
    dbOptions.forEach(option => {
      sentPollMsg.react(option.reaction);
    })

    db.set(`polls[${pollId}].botMsg`, sentPollMsg.id);
  });

  // Deleting the original message
 msg.delete();
}

function vote(messageReaction, user) {
  const pollBotMsgId = messageReaction.message.id;
  const latestPollMsgId = db.get('latestPoll');
  const latestPoll = db.get(`polls[${latestPollMsgId}]`);

  // Voting time is over
  if (pollBotMsgId != latestPoll.botMsg) return;

  // Can't vote with that reaction
  const options = db.get(`polls[${latestPollMsgId}].options`);
  
  // If you vote with an emoji which isn't an option, the bot will remove it! MUHAHA!
  if (!options.find(option => option.reaction == messageReaction._emoji.name)) {
    messageReaction.users.remove(user);
    return;
  }

  // If the user already voted
  const votes = db.get(`polls[${latestPollMsgId}].votes`);
  if (votes.find(vote => vote.user == user.id)) {
    messageReaction.users.remove(user);
    return;
  }

  const newVote = { 
    user: user.id,
    reaction: messageReaction._emoji.name 
  };
  db.push(`polls[${latestPollMsgId}].votes`, newVote);
}

function stopPoll(msg) {
  const latestPollId = db.get('latestPoll');

  if (latestPollId == null) {
    msg.channel.send('Minden szavazás le van már zárva!');
    return;
  }

  // Get the whole poll object
  const poll = db.get(`polls[${latestPollId}]`);
  const scores = [];

  poll.options.forEach(option => {
    const votes = poll.votes.filter(vote => vote.reaction == option.reaction);
    const votesCount = votes.length;
    scores.push({ option: option.option, votes: votesCount }); 
  });

  let botMessage = '**A SZAVAZÁS EREDMÉNYE**\n';

  scores.forEach(score => {
    botMessage += `${score.option}: ${score.votes} szavazat\n`;
  });

  msg.channel.send(botMessage);
  db.set('latestPoll', null);
}

exports.createPoll = createPoll;
exports.vote = vote;
exports.stopPoll = stopPoll;
