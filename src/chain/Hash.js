const crypto = require('crypto')
function md5hash(input)
{
  var hash = crypto.createHash('md5').update(input).digest('hex');
}

// exports
module.exports = 
{
  md5hash: md5hash
};