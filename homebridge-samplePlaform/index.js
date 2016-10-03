var http = require('http');
var homeDCS = require("./dcsAPI/homeNodeDCS");

var Accessory, Service, Characteristic, UUIDGen, DCSSystemFile, ActionableObjects, homeBridge;

// Private Modules




module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;
  homeBridge = homebridge;
  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-samplePlatform", "SamplePlatform", SamplePlatform, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function SamplePlatform(log, config, api) {
  log("SamplePlatform Init");
  var platform = this;
  this.log = log;
  this.config = config;
  this.baseURL = config["baseURL"];
  this.nodeId = config["nodeId"];
  this.gToken = config["gToken"];
  this.accessories = [];

  // Set DCS nodeId
  homeDCS.setNode(this.config);

  this.requestServer = http.createServer(function(request, response) {
    // if (request.url === "/add") {
    if (request.url.startsWith("/add")) {
      var queryURL = require('url').parse(request.url, true);
      this.addAccessory(queryURL.query.name, "Lightbulb");
      // this.addAccessory(new Date().toISOString());
      response.writeHead(204);
      response.end();
    }

    if (request.url == "/reachability") {
      this.updateAccessoriesReachability();
      response.writeHead(204);
      response.end();
    }

    if (request.url == "/remove") {
      this.removeAccessory();
      response.writeHead(204);
      response.end();
    }
  }.bind(this));

  this.requestServer.listen(18081, function() {
    platform.log("Server Listening... to port: 18081");
  });

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object.
      this.api = api;
      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories
      this.api.on('didFinishLaunching', function() {
        var HAPaccessories = this.accessories;
        var existingAccessory = false;
        console.log(this.accessories);

        /* Kick DCS Connection Settigns */
        homeDCS.getAccessories(this.config,"Lightbulb", function(DCSaccessories){
          // console.log(DCSaccessories.lights);
          this.DCSaccessories = DCSaccessories;

          for(var DCSaccessory in DCSaccessories.lights){
            // Log Servicing Devices
            platform.log("DCS Accessory found: (%s)",DCSaccessories.lights[DCSaccessory].name);
            if (HAPaccessories.length > 1){
              for (var index in HAPaccessories) {
                var accessorylist = HAPaccessories[index];
                platform.log("Check if Accessory exists: (%s)",accessorylist.displayName);

                if (accessorylist.displayName == this.DCSaccessories.lights[DCSaccessory].name ) {
                  existingAccessory = true;
                  platform.log("Servicing Device: (%s)",accessorylist.displayName);
                }
              }
            }
            if (existingAccessory == false){
              platform.log("Adding Accessory : (%s)",this.DCSaccessories.lights[DCSaccessory].name);
              platform.addAccessory(this.DCSaccessories.lights[DCSaccessory], "Lightbulb");
            }
            }
          });

        platform.log("DidFinishLaunching");

      }.bind(this));
  }
}

// Function invoked when homebridge tries to restore cached accessory
// Developer can configure accessory at here (like setup event handler)
// Update current value
SamplePlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;


  // set the accessory to reachable if plugin can currently process the accessory
  // otherwise set to false and update the reachability later by invoking
  // accessory.updateReachability()
  accessory.reachable = true;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");

    callback();
  });

  if (accessory.getService(Service.Lightbulb)) {
    accessory.getService(Service.Lightbulb)
    .getCharacteristic(Characteristic.On)
    .on('set', function(value, callback) {
      console.log(this.accessories);
      switch (value) {
        case false:
          value = 0;
          break;
        default: value = 1;
      }
      homeDCS.SetiDomObjectValue(accessory.displayName+'.control', value, function (body){
        console.log(value);
      });
      platform.log(accessory.displayName, "Light -> " + value);
      callback();
    })
  }
  this.accessories.push(accessory);
}

//Handler will be invoked when user try to config your plugin
//Callback can be cached and invoke when nessary
SamplePlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log("Context: ", JSON.stringify(context));
  this.log("Request: ", JSON.stringify(request));

  // Check the request response
  if (request && request.response && request.response.inputs && request.response.inputs.name) {
    this.addAccessory(request.response.inputs.name);
    console.log(request);

    // Invoke callback with config will let homebridge save the new config into config.json
    // Callback = function(response, type, replace, config)
    // set "type" to platform if the plugin is trying to modify platforms section
    // set "replace" to true will let homebridge replace existing config in config.json
    // "config" is the data platform trying to save
    callback(null, "platform", true, {"platform":"SamplePlatform", "otherConfig":"SomeData"});
    return;
  }

  // - UI Type: Input
  // Can be used to request input from user
  // User response can be retrieved from request.response.inputs next time
  // when configurationRequestHandler being invoked

  var respDict = {
    "type": "Interface",
    "interface": "input",
    "title": "Add Accessory",
    "items": [
      {
        "id": "name",
        "title": "Name",
        "placeholder": "Fancy Light"
      }//,
      // {
      //   "id": "pw",
      //   "title": "Password",
      //   "secure": true
      // }
    ]
  }

  // - UI Type: List
  // Can be used to ask user to select something from the list
  // User response can be retrieved from request.response.selections next time
  // when configurationRequestHandler being invoked

  // var respDict = {
  //   "type": "Interface",
  //   "interface": "list",
  //   "title": "Select Something",
  //   "allowMultipleSelection": true,
  //   "items": [
  //     "A","B","C"
  //   ]
  // }

  // - UI Type: Instruction
  // Can be used to ask user to do something (other than text input)
  // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

  // var respDict = {
  //   "type": "Interface",
  //   "interface": "instruction",
  //   "title": "Almost There",
  //   "detail": "Please press the button on the bridge to finish the setup.",
  //   "heroImage": "base64 image data",
  //   "showActivityIndicator": true,
  // "showNextButton": true,
  // "buttonText": "Login in browser",
  // "actionURL": "https://google.com"
  // }

  // Plugin can set context to allow it track setup process
  context.ts = "Hello";

  //invoke callback to update setup UI
  callback(respDict);
}

// Sample function to show how developer can add accessory dynamically from outside event
SamplePlatform.prototype.addAccessory = function(DCSaccessory) {
  var platform = this;
  var uuid;
  var accessoryType = DCSaccessory.devtype || "Light On/Off";
  var accessoryName = DCSaccessory.name;
  var accessoryNameId = DCSaccessory.idname || accessoryName;

  this.log("Add Accessory: " + accessoryName + " as " +  accessoryType + " with uuid: " + accessoryNameId);

  uuid = UUIDGen.generate(accessoryNameId);

  var newAccessory = new Accessory(accessoryName, uuid);
  newAccessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!");
    callback();
  });

  // Set service Information
  newAccessory.getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, accessoryNameId)
      .on('set', function(value, callback) {
        platform.log(accessory.displayName, "Set DCS Service Characteristics");
        callback();
      });

  // Plugin can save context on accessory
  // To help restore accessory in configureAccessory()
  // newAccessory.context.something = "Something"

  newAccessory.addService(Service.Lightbulb, accessoryName)
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    platform.log(accessory.displayName, "Light -> " + value);
    callback();
  });
  //
  // newAccessory.getService(Service.Lightbulb)
  // .getCharacteristic(Characteristic.On)
  // .on('get', function(value, callback) {
  //   platform.log(accessory.displayName, "Get Light -> " + value);
  //   callback();
  // });

  newAccessory.updateReachability(true);
  this.accessories.push(newAccessory);
  this.api.registerPlatformAccessories("homebridge-samplePlatform", "SamplePlatform", [newAccessory]);
}

SamplePlatform.prototype.updateAccessoriesReachability = function() {
  this.log("Update Reachability");
  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    accessory.updateReachability(true);
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
SamplePlatform.prototype.removeAccessory = function() {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("homebridge-samplePlatform", "SamplePlatform", this.accessories);

  this.accessories = [];
}
