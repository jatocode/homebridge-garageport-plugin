import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { GaragePortHomebridgePlatform } from './platform.js';
import mqttjs, { MqttClient } from 'mqtt';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GarageDoorOpener {
  private service: Service;
  private mqtt: MqttClient;
  private currentDoorState: CharacteristicValue;
  private targetDoorState: CharacteristicValue;

  constructor(
    private readonly platform: GaragePortHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.platform.log.debug('GarageDoorOpener starting');
    this.mqtt = this.setupMqtt();

    const characteristic = this.platform.Characteristic;
    this.currentDoorState = characteristic.CurrentDoorState.CLOSED;
    this.targetDoorState = this.currentDoorState;

    this.platform.log.info('Doorstates:', this.printState(this.currentDoorState), this.printState(this.targetDoorState));
    this.platform.log.debug('Openstate is:', characteristic.CurrentDoorState.OPEN);

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

  }

  private setupMqtt(): MqttClient {
    const mqtt = mqttjs.connect('mqtt://benchpress.local');
    mqtt.on('connect', () => {
      mqtt.publish('benchpress/homebridge-garageport', new Date().toUTCString(), { qos: 1, retain: true });
      mqtt.subscribe(['garage/esp32/input/#'], (err) => {
        if (err) {
          this.platform.log.error('MQTT subscription failed');
        }
      });
    });

    mqtt.on('message', async (topic, message) => {
      // this.platform.log.debug('MQTT message received:', topic, message.toString());
      if (topic.startsWith('garage/esp32/input/2/out')) {
        const msg = message.toString();
        const state = msg === '1' ?
          this.platform.Characteristic.CurrentDoorState.OPEN : this.platform.Characteristic.CurrentDoorState.CLOSED;

        this.currentDoorState = state;
        this.platform.log.debug('Updating state from mqtt ', msg, this.printState(state));
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, state);
      }
    });

    return mqtt;
  }

  async setCurrentDoorState(value: CharacteristicValue) {
    this.platform.log.info('setCurrentDoorState ->', this.printState(value));
  }

  async setTargetDoorState(value: CharacteristicValue) {
    this.platform.log.info('setTargetDoorState ->', this.printState(value));

    this.targetDoorState = value;
    this.platform.log.debug('Target state is now:', this.printState(this.targetDoorState));
    this.platform.log.debug('Current state is:', this.printState(this.currentDoorState));
    if (this.currentDoorState !== this.targetDoorState) {
      this.sendImpulseToMotor();
    }
  }

  async getCurrentDoorState(): Promise<CharacteristicValue> {
    const state = this.currentDoorState;
    this.platform.log.debug('getCurrentDoorState ->', this.printState(state));
    return state;
  }

  async getTargetDoorState(): Promise<CharacteristicValue> {
    const state = this.targetDoorState;
    this.platform.log.debug('getTargetDoorState ->', this.printState(state));
    return state;
  }

  async sendImpulseToMotor() {
    this.platform.log.warn('websocket request to impulse motor. Publishing to mqtt');
    this.mqtt.publish('garage/esp32/in', 'G', { qos: 0, retain: false });
  }

  public printState(value:CharacteristicValue):string {
    return value === 1 ? 'OPEN' : 'CLOSED';
  }

}
