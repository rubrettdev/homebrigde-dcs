
module.exports = new function()
{
  /* Get dcsNodeAPI into memory*/
  var dcsNodeAPI = require ("./dcsNodeAPI.js");
  /* Get Utilities into memory*/
  var utils = require ("./utils.js");

  /* Actionable Devices*/
  this.devicesObject = {};

  /* DCSHome Private */
  this.stringToBoolean = function (str) {
     switch(str.toLowerCase().trim()){
         case "true": case "yes": case "1": return true;
         case "false": case "no": case "0": case null: return false;
         default: return Boolean(string);
     };
  };

  /* Set Connection Settings to DCS*/
  this.setNode = function(config) {
    if (typeof config.nodeId != 'undefined' && typeof config.gToken != 'undefined'){
      dcsNodeAPI.setNode(config.nodeId,config.gToken,config.baseURL);
    }else {
      console.log(config);
      throw new Error("ERROR: DCS config not set please check you config.json file!");
    };
  };

  /* Get System File
    This function will decompress and parse from XML to JSON the System File
  */
  this.GetSystemFile = function (callback) {
    dcsNodeAPI.GetSystemFile(function (resultFromPost){
        if (!resultFromPost.code){
          var mySystemFile = utils.decode_utf8(utils.uncompress(resultFromPost.resultMessage).substring(3));
          // console.log(mySystemFile);
          var mySystemFileJSON = JSON.parse(utils.toJson(mySystemFile));
          // console.log(mySystemFileJSON);
          callback(mySystemFileJSON);
        } else{
          callback(resultFromPost);
        }
    });
  };
  /* getDeviceType */
  function getDeviceType (mySystemFileJSON){
    var data = [{}];
    var counter = 0;
    mySystemFileJSON.idom.devtypes.devtype.forEach(function(devtype){
          data[counter] = devtype;
          counter++;
    })
    return data;
  };

  /* getDevicesbyType */
  function getDevicesbyType (mySystemFileJSON, deviceType){
    var data = [{}];
    var counter = 0;
    mySystemFileJSON.idom.devices.device.forEach(function(device){
      if (device.visible == "true"){
        if(device.devtype == deviceType){
          data[counter] = device;
          counter++;
        }
      }
    })
    return data;
  };

  /* getScenarios */
  function getScenarios (mySystemFileJSON){
    var data = [{}];
    var counter = 0;
    mySystemFileJSON.idom.scenarios.scenario.forEach(function(device){
      if (device.visible == "true"){
          data[counter] = device;
          counter++;
      }
    })
    return data;
  };

  /* Fill devicesObject for UI preview */
  getActionObjects = function (mySystemFileJSON){
    //define Objects for visualization
    // this.devicesObject.devtypes = getDeviceType(mySystemFileJSON);
    // this.devicesObject.sensors = getDevicesbyType(mySystemFileJSON,'Motion Sensor');
    this.devicesObject = {'lights':getDevicesbyType(mySystemFileJSON,'Light On/Off')};
    // this.devicesObject.scenarios = getScenarios(mySystemFileJSON);
    return devicesObject;
  }

  /* Get Object value */
  this.GetiDomObjectValue = function (iDomObject, callback){
    return dcsNodeAPI.getValue(iDomObject, function (body){
      return callback(body);
    });
  };


  // this.GetiDomGroupObjectValue = function (iDomObject, callback){
  //   // this.connect();
  //   dcsNodeAPI.getValue(iDomObject, function (body){
  //     callback(body);
  //   });
  // };


  this.getAccessories = function (config, accessoryType, callback){
    // Get Gateway System file
    this.devicesObject.config = config;
    this.setNode(config);
    this.GetSystemFile(function (body){
      if (body.code == -1){
        // Do Nothing - ERROR to be treated later
        throw new Error("ERROR: (%s) %s",body.code, body.message);
        console.log("ERROR: (%s) %s",body.code, body.message );
        // console.log(body);
      }else {
        callback(getActionObjects(body));
      }
    });
  }

  /* Get Object value */
  this.SetiDomObjectValue = function (iDomObject, value, callback){
    // this.connect();
    dcsNodeAPI.setValue(iDomObject, value, function (body){
      callback(body);
    });
  };

  // this.refreshValues = function ()
  // {
  //   dcsNodeAPI.pushGetRequest("DCS_CONTROL_ON_OFF_1.percentcontrol");
  //   dcsNodeAPI.pushGetRequest("DCS_CONTROL_ON_OFF_2.percentcontrol");
  //   dcsNodeAPI.pushGetRequest("DCS_CONTROL_ON_OFF_3.percentcontrol");
  //   return dcsNodeAPI.execGetRequest();
  // }


};
