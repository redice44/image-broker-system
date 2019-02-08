const AWS = require('aws-sdk');
const rp = require('request-promise');
const moment = require('moment');
const TopicConnector = require('@redice44/rabbitmq-topic-routing-schema');
const topic = require('./topics/images');
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});
const bucket = process.env.S3_BUCKET;
const IMG_EXT = 'jpeg';

const main = async () => {
  const ms = process.env.POLL_INTERVAL;
  const url = process.env.IMAGE_SOURCE;
  const filePath = process.env.IMAGE_DIR;

  const connectionString = {
    user: process.env.RABBITMQ_USER,
    pass: process.env.RABBITMQ_PASS,
    url: process.env.RABBITMQ_URL
  };
  const { name, schema } = topic;
  const connection = await setupConnection(connectionString, { name, schema });

  try {
    await s3.headBucket({
      Bucket: bucket
    }).promise();
  } catch (error) {
    if (error.code && error.code === 'NotFound') {
      const res = await s3.createBucket({
        Bucket: bucket
      }).promise();
    } else {
      process.exit(1);
    }
  }

  setInterval(getImage, ms, connection, url, filePath);
};

const getImage = async (brokerConnection, url, filePath) => {
  const fileName = `${moment().format('x')}.${IMG_EXT}`;
  console.log(`\n=== ${fileName} ===`);
  console.log('Capturing image');
  const img = await rp.get({ url, encoding: null });
  const exchangeTopic = {
    location: 'canalParkingLot',
    sourceType: 'raw',
    format: 'jpeg'
  };
  const brokerMessage = {
    bucket,
    key: fileName
  };
  try {
    console.log('Storing image');
    const r = await s3.putObject({
      Bucket: bucket,
      Key: fileName,
      Body: img
    }).promise();
    console.log('Publishing event');
    await brokerConnection.publishToTopic(
      exchangeTopic,
      JSON.stringify(brokerMessage),
      { timestamp: +moment() }
    );
  } catch (error) {
    console.log(error);
  }
  return fileName;
};

const setupConnection = async (connectionString, { name, schema }) => {
  const connection = new TopicConnector(connectionString, name, schema);
  await connection.connectWithRetry();
  await connection.createTopic();
  return connection;
};

main();
