var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var errors = require('./errors');

function getChannelMapping() {
  var mapping = process.env.CHANNEL_MAPPING;
  try {
    var jsonMapping = JSON.parse(mapping);

    return jsonMapping;
  } catch(e) {
    // Mapping might be given as a file path, try to find the file and JSON.parse it
    try {
      var mainFolder = process.cwd();
      var mappingPath = path.resolve(mainFolder, mapping);

      mapping = JSON.parse(fs.readFileSync(mappingPath));
    } catch(e) {
      throw new errors.ChannelMappingError();
    }

    if (!_.isObject(mapping)) {
      throw new errors.ChannelMappingError();
    }

    return mapping;
  }
}

module.exports = getChannelMapping();
