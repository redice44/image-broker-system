const AWS = require('aws-sdk');
const fs = require('fs');
const mkdirp = require('mkdirp');
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
const filePath = process.env.IMAGE_DIR;

const main = async () => {
  const connectionString = {
    user: process.env.RABBITMQ_USER,
    pass: process.env.RABBITMQ_PASS,
    url: process.env.RABBITMQ_URL
  };
  const { name, schema } = topic;
  const connection = await setupConnection(connectionString, { name, schema });
  mkdirp(filePath);
  await connection.subscribeToTopic({
    location: 'canalParkingLot',
    sourceType: 'raw',
    format: 'jpeg'
  }, retrieveImage);
};

const retrieveImage = async (message) => {
  console.log('\n=== New Message ===');
  const { bucket, key } = JSON.parse(message.content.toString());
  const fileLocation = `${filePath}/${key.split('/').slice(-1)[0]}`;
  console.log('Retrieving Image');
  console.log(`  B: ${bucket}`);
  console.log(`  K: ${key}`);
  const file = await s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();
  console.log(`Writing: ${fileLocation}`);
  const buff = Buffer.from(file.Body);
  fs.writeFileSync(fileLocation, buff, { encoding: 'binary' });
};

const setupConnection = async (connectionString, { name, schema }) => {
  const connection = new TopicConnector(connectionString, name, schema);
  await connection.connectWithRetry();
  await connection.createTopic();
  return connection;
};

main();
