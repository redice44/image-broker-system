const fs = require('fs');
const rp = require('request-promise');
const moment = require('moment');
const mkdirp = require('mkdirp');
const TopicConnector = require('@redice44/rabbitmq-topic-routing-schema');
const topic = require('./topics/images');

const main = async () => {
  const ms = process.env.POLL_INTERVAL;
  const url = process.env.IMAGE_SOURCE;
  const filePath = process.env.IMAGE_DIR;

  mkdirp(filePath);
  const connectionString = {
    user: process.env.RABBITMQ_USER,
    pass: process.env.RABBITMQ_PASS,
    url: process.env.RABBITMQ_URL
  };
  const { name, schema } = topic;
  const connection = await setupConnection(connectionString, { name, schema });
  setInterval(getImage, ms, connection, url, filePath);
};

const getImage = async (brokerConnection, url, filePath) => {
  const fileLocation = `${filePath}/${moment().format('x')}.jpeg`;
  const img = await rp.get({ url, encoding: 'binary' });
  const exchangeTopic = {
    location: 'canalParkingLot',
    sourceType: 'raw',
    format: 'jpeg'
  };
  const brokerMessage = {
    imageLocation: fileLocation
  };

  console.log(`Writing ${fileLocation}...`);
  fs.writeFileSync(fileLocation, img, { encoding: 'binary' });
  await brokerConnection.publishToTopic(
    exchangeTopic,
    JSON.stringify(brokerMessage),
    { timestamp: +moment() }
  );
};

const setupConnection = async (connectionString, { name, schema }) => {
  const connection = new TopicConnector(connectionString, name, schema);
  await connection.connectWithRetry();
  await connection.createTopic();
  return connection;
};

main();
