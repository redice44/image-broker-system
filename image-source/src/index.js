const fs = require('fs');
const rp = require('request-promise');
const moment = require('moment');
const mkdirp = require('mkdirp');

const main = () => {
  const ms = process.env.POLL_INTERVAL;
  const url = process.env.IMAGE_SOURCE;
  const filePath = process.env.IMAGE_DIR;

  mkdirp(filePath);
  setInterval(getImage, ms, url, filePath);
};

const getImage = async (url, filePath) => {
  const fileLocation = `${filePath}/${moment().format('x')}.jpeg`;
  const img = await rp.get({ url, encoding: 'binary' });

  console.log(`Writing ${fileLocation}...`);
  fs.writeFileSync(fileLocation, img, { encoding: 'binary' });
};

main();
