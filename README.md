## Homebridge Magnetic Lock Plugin

### Summary
This is a plugin for [homebridge](https://github.com/nfarina/homebridge). It is a fully-working
simple implementation of a magnetic door lock accessory.

### Installation
```
sudo npm install -g homebridge-magnetic-lock
```

### Configuration

#### Configuration sample
```json
accessories: [
  {
    "accessory": "MagneticLockAccessory",
    "name": "Gate Lock",
    "lockSwitchPin": 23,
    "unlockDurationInSecs": 60,
    "lockPollInMs": 1000
  }
]
```
#### Fields
