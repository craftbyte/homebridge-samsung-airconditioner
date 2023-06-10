var Service, Characteristic;
var fs = require('fs');
var path = require('path');
const https = require('https');
const axios = require('axios');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    //UUIDGen = homebridge.hap.uuid;
    homebridge.registerAccessory("homebridge-samsung-airconditioner", "SamsungAirconditioner", SamsungAirco);
};

function SamsungAirco(log, config) {
    this.log = log;
    this.name = config["name"];
    this.ip = config["ip"];
    this.token = config["token"];
    this.accessoryName = config["name"];
    this.setOn = true;
    this.setOff = false;
    this.axios = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            cert: fs.readFileSync(path.join(__dirname, 'ac14k_m.pem')),
            key: fs.readFileSync(path.join(__dirname, 'ac14k_m.key')),
            ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
            ciphers: "DEFAULT:@SECLEVEL=0"
        }),
        headers: {
            'Authorization': 'Bearer ' + this.token,
        }
    });
}

SamsungAirco.prototype = {

    identify: function (callback) {
        this.log("Identify the clima!");
        callback(); // success
    },

    execGetRequest: function (url, callback) {
        this.axios.get('https://' + this.ip + ':8888' + url).then(callback)
    },

    execPutRequest: function (url, data, callback) {
        axios.put('https://' + this.ip + ':8888' + url, data).then(callback)
    },

    execPostRequest: function (url, data, callback) {
        axios.post('https://' + this.ip + ':8888' + url, data).then(callback)
    },

    getServices: function () {

        //var uuid;
        //uuid = UUIDGen.generate(this.accessoryName);
        this.aircoSamsung = new Service.HeaterCooler(this.name);


        this.aircoSamsung.getCharacteristic(Characteristic.Active).on('get', this.getActive.bind(this)).on('set', this.setActive.bind(this)); //On  or Off

        this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: -20,
                maxValue: 100,
                minStep: 0.1
            })
            .on('get', this.getCurrentTemperature.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.TargetHeaterCoolerState).on('get', this.getMode.bind(this)).on('set', this.setMode.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getDesiredTemperature.bind(this))
            .on('set', this.setDesiredTemperature.bind(this));


        var informationService = new Service.AccessoryInformation();


        return [informationService, this.aircoSamsung];

    },

    //services


    getDesiredTemperature: function (callback) {
        this.execGetRequest(str, function (response) {
            if (response.status == 200) {
                let res = response.json();
                callback(null, res.Devices[0].Temperatures[0].desired);
            } else {
                this.log('getDesiredTemperature function failed', response);
                callback(response);
            }
        }.bind(this))
    },

    setDesiredTemperature: function (temp, callback) {
        this.execPutRequest('/devices/0/temperatures/0', {desired: temp}, function (response) {
            if (response.status == 200) {
                callback(null, temp);
            } else {
                this.log('setDesiredTemperature function failed', response);
                callback(response);
            }
        }.bind(this))

    },

    getCurrentHeaterCoolerState: function (callback) {
        this.execGetRequest('/devices/0/mode', function (response) {
            if (response.status == 200) {
                let res = response.json();
                switch (res.Mode.modes[0])
                {
                    case "Cool":
                        callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
                        break;
                    case "Heat":
                        callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
                        break;
                    case "Fan":
                        callback(null, Characteristic.CurrentHeaterCoolerState.OFF);
                        break;
                    case "Wind":
                        callback(null, Characteristic.CurrentHeaterCoolerState.OFF);
                        break;
                    case "Dry":
                        callback(null, Characteristic.CurrentHeaterCoolerState.OFF);
                        break;
                    case "Auto":
                        callback(null, Characteristic.CurrentHeaterCoolerState.AUTO);
                        break;
                    default:
                        callback(null, Characteristic.CurrentHeaterCoolerState.OFF);
                        break;
                }
            } else {
                this.log('getCurrentHeaterCoolerState function failed', response);
                callback(response);
            }
        }.bind(this))
    },

    getCurrentTemperature: function (callback) {
        this.execGetRequest('/devices/0/temperatures/0', function (response) {
            if (response.status == 200) {
                let res = response.json();
                callback(null, res.Temperature.current);
            } else {
                this.log('getCurrentTemperature function failed', response);
                callback(response);
            }
        }.bind(this))
    },


    getActive: function (callback) {
        this.execGetRequest('/devices/0/operation', function (response) {
            if (response.status == 200) {
                let res = response.json();
                if (res.Operation.power == "On") {
                    callback(null, Characteristic.Active.ACTIVE);
                } else {
                    callback(null, Characteristic.Active.INACTIVE);
                }
            } else {
                this.log('getActive function failed', response);
                callback(response);
            }
        }.bind(this))

    },

    setActive: function (state, callback) {
        this.execPutRequest('/devices/0', {"Operation": {power: state == Characteristic.Active.ACTIVE ? "On" : "Off"}}, function (response) {
            if (response.status == 200) {
                callback();
            } else {
                this.log('setActive function failed', response);
                callback(response);
            }
        }.bind(this))
    },

    setPowerState: function (powerOn, callback) {
        this.execPutRequest('/devices/0', {"Operation": {power: powerOn ? "On" : "Off"}}, function (response) {
            if (response.status == 200) {
                callback();
            } else {
                this.log('setActive function failed', response);
                callback(response);
            }
        }.bind(this))
    },

    getMode: function (callback) {
        this.execGetRequest('/devices/0/mode', function (response) {
            if (response.status == 200) {
                let res = response.json();
                var mode = Characteristic.TargetHeaterCoolerState.AUTO;
                switch (res.Mode.modes[0]) {
                    case "Cool":
                        mode = Characteristic.TargetHeaterCoolerState.COOL;
                        break;
                    case "Heat":
                        mode = Characteristic.TargetHeaterCoolerState.HEAT;
                        break;
                    case "Fan":
                    case "Wind":
                    case "Dry":
                    case "Auto":
                    default:
                        mode = Characteristic.TargetHeaterCoolerState.AUTO;
                        break;
                }
                callback(null, mode);
            } else {
                this.log('getMode function failed', response);
                callback(response);
            }
        }.bind(this));
    },
    setMode: function (state, callback) {
        var mode;
        switch (state) {
            case Characteristic.TargetHeaterCoolerState.COOL:
                mode = "Cool";
                break;
            case Characteristic.TargetHeaterCoolerState.HEAT:
                mode = "Heat";
                break;
            case Characteristic.TargetHeaterCoolerState.AUTO:
                mode = "Auto";
                break;
        }
        this.execPutRequest('/devices/0/mode', {modes: [mode]}, function (response) {
            if (response.status == 200) {
                callback();
            } else {
                this.log('setMode function failed', response);
                callback(response);
            }
        }.bind(this));
    }
};

