import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { GaragePortHomebridgePlatform } from './platform.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GarageDoorOpener {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: GaragePortHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tobias')
      .setCharacteristic(this.platform.Characteristic.Model, 'LM60')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '0000000');

    this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) ||
      this.accessory.addService(this.platform.Service.GarageDoorOpener);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/GarageDoorOpener

    this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .onSet(this.setTargetDoorState.bind(this))
      .onGet(this.getTargetDoorState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .onSet(this.setCurrentDoorState.bind(this))
      .onGet(this.getCurrentDoorState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected)
      .onSet(this.setObstruction.bind(this))
      .onGet(this.getObstruction.bind(this));
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setCurrentDoorState(value: CharacteristicValue) {
    this.platform.log.debug('handleSetCurrentDoorState ->', value);
  }

  async setTargetDoorState(value: CharacteristicValue) {
    this.platform.log.debug('handleSetTargetDoorState ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getCurrentDoorState(): Promise<CharacteristicValue> {
    const state = this.exampleStates.On;

    this.platform.log.debug('getCurrentDoorState ->', state);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return state;
  }

  async getTargetDoorState(): Promise<CharacteristicValue> {
    const state = this.exampleStates.On;

    this.platform.log.debug('getTargetDoorState ->', state);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return state;
  }

  async setObstruction(value: CharacteristicValue) {
    this.platform.log.debug('Obstruction not implemented -> ', value);
  }

  async getObstruction(): Promise<CharacteristicValue> {
    this.platform.log.debug('Obstruction not implemented');
    return false;
  }

}
