const fs = require('fs')
let Service, Characteristic

class MagneticLockAccessory {
  constructor (log, config) {
    this.log = log
    this.config = config
    this.config.unlockDurationInSecs = parseInt(config.unlockDurationInSecs)
    this.config.lockPollInMs = parseInt(config.lockPollInSecs) * 1000
    const {
      lockSwitchPin,
      unlockDurationInSecs,
      lockPollInMs,
      lockPollInSecs
    } = this.config

    log(`Lock Switch Pin: ${lockSwitchPin}`)
    log(`Unlock Duration in seconds: ${unlockDurationInSecs}`)
    log(`Lock poll in seconds: ${lockPollInSecs}`)
    this.initService()
    setTimeout(this.monitorLockState.bind(this), lockPollInMs)
  }

  initService () {
    const {
      config: { name }
    } = this
    const { LockCurrentState, LockTargetState } = Characteristic

    this.magneticLock = new Service.LockMechanism(name)
    this.currentLockState = this.magneticLock.getCharacteristic(
      LockCurrentState
    )
    this.targetLockState = this.magneticLock.getCharacteristic(LockTargetState)

    const { currentLockState, targetLockState } = this
    const initialLockState = LockCurrentState.SECURED
    const getState = this.getState.bind(this)
    const setState = this.setState.bind(this)

    currentLockState.on('get', getState)
    targetLockState.on('get', getState).on('set', setState)

    currentLockState.setValue(initialLockState)
    targetLockState.setValue(initialLockState)
  }

  monitorLockState () {
    const {
      currentLockState,
      monitorLockState,
      config: { lockPollInMs }
    } = this

    currentLockState.setValue(this.gpioRead())
    setTimeout(monitorLockState.bind(this), lockPollInMs)
  }

  gpioWrite (value) {
    const { lockSwitchPin } = this.config
    fs.writeFileSync(`/sys/class/gpio/gpio${lockSwitchPin}/value`, value)
  }

  gpioRead () {
    const { lockSwitchPin } = this.config
    return parseInt(
      fs
        .readFileSync(`/sys/class/gpio/gpio${lockSwitchPin}/value`, 'utf8')
        .trim()
    )
  }

  getState (cb) {
    cb(null, this.gpioRead())
  }

  setState (state, cb) {
    const {
      currentLockState,
      log,
      targetLockState,
      unlockDurationInSecs
    } = this

    log(state ? 'Locking' : 'Unlocking')

    switch (state) {
      case Characteristic.LockCurrentState.UNSECURED:
        this.gpioWrite(state)
        setTimeout(
          function () {
            const lockedState = Characteristic.LockCurrentState.SECURED
            log('Auto-locking')
            targetLockState.setValue(lockedState)
            currentLockState.setValue(lockedState)
          }.bind(this),
          unlockDurationInSecs * 1000
        )
        break
      default:
        this.gpioWrite(state)
        currentLockState.setValue(state)
    }
    cb()
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
