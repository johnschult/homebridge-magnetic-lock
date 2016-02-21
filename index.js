var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-magnetic-lock', 'MagneticLock', MagneticLockAccessory);
}

function MagneticLockAccessory(log, config) {
  this.log = log;
  this.name = config['name'];
  this.lockSwitchPin = config['lockSwitchPin'];
  this.unlockDuration = config['unlockDuration'];
  this.service = new Service.LockMechanism(this.name);
  this.service
    .getCharacteristic(Characteristic.LockCurrentState)
    .on('get', this.getState.bind(this));
  this.service
    .getCharacteristic(Characteristic.LockTargetState)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));
  this.infoService = new Service.AccessoryInformation();
  this.infoService
    .setCharacteristic(Characteristic.Manufacturer, 'Opensource Community')
    .setCharacteristic(Characteristic.Model, 'GPIO Magnetic Lock')
    .setCharacteristic(Characteristic.SerialNumber, 'Version 0.0.1');
}

MagneticLockAccessory.prototype.gpioWrite = function(value) {
  fs.writeFileSync('/sys/class/gpio/gpio' + this.lockSwitchPin + '/value', value);
}

MagneticLockAccessory.prototype.gpioRead = function() {
  return parseInt(
    fs.readFileSync('/sys/class/gpio/gpio' + this.lockSwitchPin + '/value', 'utf8').trim());
}

MagneticLockAccessory.prototype.getState = function(callback) {
  callback(null, this.gpioRead());
}

MagneticLockAccessory.prototype.setState = function(state, callback) {
  this.log('Setting state to ' + state);
  this.gpioWrite(state);
  callback();
  return true;
}

MagneticLockAccessory.prototype.getServices = function() {
  return [this.service];
}
