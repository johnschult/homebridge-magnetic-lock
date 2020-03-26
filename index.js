const fs = require('fs')
let Service, Characteristic

class MagneticLockAccessory {
  constructor (log, config) {
    const { name, lockSwitchPin, unlockDurationInSecs, lockPollInSecs } = config
    this.log = log
    this.name = name
    this.lockSwitchPin = lockSwitchPin
    this.unlockDurationInSecs = parseInt(unlockDurationInSecs)
    this.lockPollInMs = parseInt(lockPollInSecs) * 1000
    log(`Lock Switch Pin: ${lockSwitchPin}`)
    log(`Unlock Duration in seconds: ${unlockDurationInSecs}`)
    log(`Lock poll in seconds: ${lockPollInSecs}`)
    this.initService()
    setTimeout(this.monitorLockState.bind(this), this.lockPollInMs)
  }

  monitorLockState () {
    const state = this.gpioRead()
    this.currentLockState.setValue(state)
    setTimeout(this.monitorLockState.bind(this), this.lockPollInMs)
  }

  initService () {
    this.magneticLock = new Service.LockMechanism(this.name)
    this.currentLockState = this.magneticLock.getCharacteristic(
      Characteristic.LockCurrentState
    )
    this.currentLockState.on('get', this.getState.bind(this))
    this.targetLockState = this.magneticLock.getCharacteristic(
      Characteristic.LockTargetState
    )
    this.targetLockState
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this))
    this.currentLockState.setValue(Characteristic.LockCurrentState.SECURED)
    this.targetLockState.setValue(Characteristic.LockCurrentState.SECURED)
  }

  gpioWrite (value) {
    fs.writeFileSync(
      '/sys/class/gpio/gpio' + this.lockSwitchPin + '/value',
      value
    )
  }

  gpioRead () {
    return parseInt(
      fs
        .readFileSync(
          '/sys/class/gpio/gpio' + this.lockSwitchPin + '/value',
          'utf8'
        )
        .trim()
    )
  }

  getState (callback) {
    callback(null, this.gpioRead())
  }

  setState (state, callback) {
    this.log(`Setting state to ${state}`)
    switch (state) {
      case Characteristic.LockCurrentState.UNSECURED:
        this.gpioWrite(state)
        setTimeout(
          function () {
            const lockedState = Characteristic.LockCurrentState.SECURED
            this.log(`Automatically setting state to ${lockedState}`)
            this.targetLockState.setValue(lockedState)
            this.currentLockState.setValue(lockedState)
          }.bind(this),
          this.unlockDurationInSecs * 1000
        )
        break
      default:
        this.gpioWrite(state)
        this.currentLockState.setValue(state)
    }
    callback()
    return true
  }

  getServices () {
    return [this.magneticLock]
  }
}

module.exports = homebridge => {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory(
    'homebridge-magnetic-lock',
    'MagneticLock',
    MagneticLockAccessory
  )
}
