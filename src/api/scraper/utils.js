const MessageParser = require("./messageParser");
var SimpleCrypto = require("simple-crypto-js").default;

const secretKey = "some-unique-key";

const hashPhoneNumbers = (messages) => {
  const newMessages = messages;
  const participants = Array.from(
    new Set(messages.map(({ author }) => author))
  ).filter((author) => author !== "System");

  const hashedParticipants = hashParticipants(participants);

  const hashedMessages = newMessages.map((msg) => ({
    ...msg,
    author: hashedParticipants[msg.author],
  }));

  return hashedMessages;
};

const hashParticipants = (participants) => {
  const simpleCrypto = new SimpleCrypto(secretKey);
  const hashedParticipants = participants.reduce((obj, participant, i) => {
    return { ...obj, [participant]: `${simpleCrypto.encrypt(participant)}` };
  }, {});
  return hashedParticipants;
};

exports.hashPhoneNumbers = hashPhoneNumbers;
