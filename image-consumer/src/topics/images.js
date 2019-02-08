module.exports = {
  name: 'image-sources',
  schema: [{
    key: 'location',
    values: ['canalParkingLot', 'canalBridge'],
    description: 'Location of the image source'
  }, {
    key: 'sourceType',
    values: ['raw', 'live'],
    description: 'Source type of image'
  }, {
    key: 'format',
    values: ['jpeg'],
    desription: 'Image type'
  }]
};
