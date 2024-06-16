import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { GaragePortHomebridgePlatform } from './platform.js';
import mqttjs, { MqttClient } from 'mqtt';
//import { io, Socket } from 'socket.io-client';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GarageDoorOpener {
  private service: Service;
  // private socket: Socket;
  // private url:string;
  private mqtt: MqttClient;
  private currentDoorState: CharacteristicValue;
  private targetDoorState: CharacteristicValue;

  constructor(
    private readonly platform: GaragePortHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.platform.log.debug('GarageDoorOpener starting');
    // this.url = 'https://mqtt.taklamakan.se';

    this.mqtt = this.setupMqtt();
    // this.socket = this.SetupSocketIO();

    const characteristic = this.platform.Characteristic;
    this.currentDoorState = characteristic.CurrentDoorState.CLOSED;
    this.targetDoorState = this.currentDoorState;

    this.platform.log.info('Doorstates:', this.currentDoorState, this.targetDoorState);
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

  // private SetupSocketIO(): Socket {
  //   const socket = io(this.url);
  //   this.platform.log.debug('Trying to connect ' + this.url);

  //   socket.on('status', (message) => {
  //     this.platform.log.debug('Status: ', message);
  //     const state = message.status.garage === 'open' ?
  //       this.platform.Characteristic.CurrentDoorState.OPEN : this.platform.Characteristic.CurrentDoorState.CurrentDoorState.CLOSED;

  //     this.platform.log.info('Updating state from websocket ', message);
  //     this.currentDoorState = state;
  //     // this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, state);
  //   });

  //   socket.on('connect', () => {
  //     this.platform.log.warn('SocketIO connected to ' + this.url);
  //   });

  //   setInterval(() => socket.emit('status'), 1000);

  //   return socket;
  // }

  private setupMqtt(): MqttClient {
    const mqtt = mqttjs.connect('mqtt://benchpress.local');
    mqtt.on('connect', () => {
      mqtt.publish('benchpress/homebridge-garageport', new Date().toUTCString(), { qos: 1, retain: true });
      mqtt.subscribe(['garage/esp32/input/#', 'esp32garage'], (err) => {
        if (err) {
          this.platform.log.error('MQTT subscription failed');
        }
      });
    });

    mqtt.on('message', async (topic, message) => {
      if (topic.startsWith('esp32garage')) {
        const esp32state = JSON.parse(message.toString());
        const status = {
          relayA: esp32state.relayA === '0',
          relayB: esp32state.relayB === '0',
          input1: esp32state.input1 === '0',
          input2: esp32state.input2 === '0',
        };
        const state = status.input2 ?
          this.platform.Characteristic.CurrentDoorState.OPEN : this.platform.Characteristic.CurrentDoorState.CLOSED;

        this.currentDoorState = state;
        this.platform.log.debug('Updating state from mqtt ', status, state);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, state);
      }
    });

    return mqtt;
  }

  async setCurrentDoorState(value: CharacteristicValue) {
    this.platform.log.info('setCurrentDoorState ->', value);
  }

  async setTargetDoorState(value: CharacteristicValue) {
    this.platform.log.info('setTargetDoorState ->', value);

    this.targetDoorState = value;
    this.platform.log.debug('Target state is now:', this.targetDoorState);
    this.platform.log.debug('Current state is:', this.currentDoorState);
    if (this.currentDoorState !== this.targetDoorState) {
      this.sendImpulseToMotor();
    }
  }

  async getCurrentDoorState(): Promise<CharacteristicValue> {
    const state = this.currentDoorState;
    this.platform.log.debug('getCurrentDoorState ->', state);
    return state;
  }

  async getTargetDoorState(): Promise<CharacteristicValue> {
    const state = this.targetDoorState;
    this.platform.log.debug('getTargetDoorState ->', state);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return state;
  }

  async sendImpulseToMotor() {
    this.platform.log.warn('websocket request to impulse motor. Publishing to mqtt');
    this.mqtt.publish('garage/esp32/in', 'G', { qos: 0, retain: false });
  }

}
