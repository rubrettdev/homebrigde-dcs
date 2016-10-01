var Utils = new function() {

  this.uncompress = function (b64Data){
    var pako = require ("pako");
    var atob = require ("atob");
    // Decode base64 (convert ascii to binary)
    var strData     = atob(b64Data);
    // Convert binary string to character-number array
    var charData    = strData.split('').map(function(x){return x.charCodeAt(0);});
    // Turn number array into byte-array
    var binData     = new Uint8Array(charData);
    // Pako magic
    var data        = pako.inflate(binData);
    // Convert gunzipped byteArray back to ascii string:
    return String.fromCharCode.apply(null, new Uint16Array(data));
  }

  this.encode_utf8 = function (s) {
    return unescape(encodeURIComponent(s));
  };

  this.decode_utf8 = function (s) {
    return decodeURIComponent(escape(s));
  };

  this.toJson = function (xml){
    var xml2json = require ("xml2json");
    return xml2json.toJson(xml)
  }

};
module.exports = Utils;
