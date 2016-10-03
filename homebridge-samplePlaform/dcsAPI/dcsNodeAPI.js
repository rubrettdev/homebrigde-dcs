module.exports  = new function()
{
	// Require needle.JS for RESTFULL requests
	var needle = require('needle');

	var baseUrl = "https://dcs.domaticasolutions.com/api/v1/operation/monitorControl/";
	this.setNode = function(nodeId, gToken, newBaseUrl)
	{
		this.nodeId = nodeId;
		this.gToken = gToken;
		this.getRequestString = "";
		this.setRequestString = "";
		if (newBaseUrl){
			baseUrl = newBaseUrl;
		}
    console.log("DCS setNode: " + nodeId);
	}
	/*private*/
	this.sendRestQuery = function (url, payload, callback) {
		// console.log(payload);
		// Check if payload is String and convert to JSON Object
		console.log("Payload typeof: %s",typeof payload);
		console.log(payload);
		if (typeof payload == "string"){
			try {
				payload = JSON.parse(payload);
			} catch (e) {
				console.log(e);
			} finally {
				console.log("Payload Converted to JSON Object");
			}
		}
    var options = {
      headers: {
         "Content-Type": "application/json"
       },
       json: true
    };
    needle.post(url, payload, options,
    function (error, response, body) {
        if(error){
          console.log('Server ERROR! [%s] : %s', error.code, error.message)
        } else {
          console.log('statusCode: '+ response.statusCode)
					body = JSON.parse(body);
					if (body.code == -1){
						body.payload = payload;
						body.option = options;
						body.baseUrl = url;
						return callback(body);
					}else {
						return callback(body);
					}
        }
      });
	}
	/*private*/
  this.sendCommand = function (url, payload, callback) {
    // API RESTFULL Call
		this.sendRestQuery(url, payload, function (body){
			callback(body);
		});
	}
	/*private*/
	this.realTimeCommand = function (nodeId, gToken, cmdUrl, objName, objValue, callback) {
		var url = baseUrl + cmdUrl;
		console.log("Data for %s", objValue);
		var cmdBody = '{"gTokens":[{"vGatewayId":"' + nodeId + '","gToken":"' + gToken + '"}],"objects":[{"vGatewayId":"' + nodeId + '","idname":"' + objName + '","data":"' + objValue + '"}]}';
		console.log("RTCommand: %s", cmdBody);
		this.sendCommand(url, cmdBody, function (body){
				console.log(body);
				callback(body);
		});
	}
	/*private*/
	this.getLogs = function (nodeId, gToken, params, callback)
	{
		params = btoa(params);
		var url = baseUrl + "requestLog";
		var cmdBody = '{"vGatewayId":"'+nodeId+'","gToken":"'+gToken+'","parameters":"'+params+'"}';
		this.sendCommand(url, cmdBody, function(body){
			var result = JSON.parse(body);
				var zipBytes = atob(result.resultMessage);
				callback(pako.inflate(zipBytes, { to: 'string', chunkSize: zipBytes.length }));
		});

	}
	/* Public access */
	this.getLogByTimestamp = function(timestamp, callback)
	{
		var params = "$timestamp=" + timestamp + ";$tolerance=10";
		this.getLogs(this.nodeId, this.gToken, params, function (body){
			callback(body);
		});
	}
	this.getLogByQuantity = function(quantity, callback)
	{
		var params = "$quantity=" + quantity + ";$tolerance=10";
		this.getLogs(this.nodeId, this.gToken, params, function (body){
			callback(body);
		});

	}
	this.getValue = function (objName, callback)
	{
		this.realTimeCommand(this.nodeId, this.gToken, "get", objName, "", function (body){
			callback(body);
		});
	}
	this.setValue = function(objName, objValue, setValuecallback)
	{
		this.realTimeCommand(this.nodeId, this.gToken, "set", objName, objValue, function (body){
			console.log(body);
			// setValuecallback(body);
		});
	}
	this.clearGetRequest = function () {
		this.getRequestString = "";
	}
	this.pushGetRequest = function (objName) {
		if (this.getRequestString.length > 0) {
			this.getRequestString += ',';
		}
		this.getRequestString += '{"vGatewayId":"' + this.nodeId + '","idname":"' + objName + '","data":""}';
	}
	this.execGetRequest = function (callback) {
			this.sendCommand(baseUrl + 'get', '{"gTokens":[{"vGatewayId":"' + this.nodeId + '","gToken":"' + this.gToken + '"}],"objects":[' + this.getRequestString + ']}', function (body){
					var result = JSON.parse(body);
					this.clearGetRequest();
					callback(result.objects);
			});
	}
	this.clearSetRequest = function () {
		this.setRequestString = "";
	}
	this.pushSetRequest = function (objName, objValue) {
		if (this.setRequestString.length > 0)
		{
		    this.setRequestString += ',';
		}
		this.setRequestString += '{"vGatewayId":' + this.nodeId + ',"idname":"' + objName + '","data":"' + objValue + '"}';
	}
	this.execSetRequest = function () {
			this.sendCommand(baseUrl + 'set', '{"gTokens":[{"vGatewayId":"' + this.nodeId + '","gToken":"' + this.gToken + '"}],"objects":[' + this.setRequestString + ']}', function (body){
				var result = JSON.parse(body);
				this.clearSetRequest();
		    return result.objects;
			});
	}

	// SystemFile - Brettes
	this.GetSystemFile = function (callback) {
		// Test payload as Object
		// var payload = {
		// 	"vGatewayId": this.nodeId,
		// 	"gToken": this.gToken,
		// 	"parameters":""
		// };
		// Test payload as String
		var payload = '{"vGatewayId":"' + this.nodeId + '","gToken":"' + this.gToken + '","parameters":""}';
    var result = this.sendCommand(baseUrl + 'requestSystemFile', payload, function (data){
			callback(data);
		});
		// console.log("Result %s",result);
	}

};
