const AWS = require('aws-sdk');
const fs = require('fs');
const rp = require('request-promise');
const moment = require('moment');
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

  mkdirp(filePath);

  try {
    const headBucket = await s3.headBucket({
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
  //const fileName = await getImage(connection, url, filePath);
  //await retrieveImage(fileName, filePath);
  //process.exit(0);
};

const retrieveImage = async (key, filePath) => {
  const fileLocation = `${filePath}/minio-${key}`;
  const file = await s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise();
  const buff = Buffer.from(file.Body);
  fs.writeFileSync(fileLocation, buff, { encoding: 'binary' });
};

const getImage = async (brokerConnection, url, filePath) => {
  const fileName = `${moment().format('x')}.${IMG_EXT}`;
  //const fileLocation = `${filePath}/${fileName}`;
  console.log(`=== ${fileName} ===`);
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
  //fs.writeFileSync(fileLocation, img, { encoding: 'base64' });
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
