load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');
load('api_rpc.js');

// global variaveis
let MQTT_REGISTER_TOPIC = Cfg.get('mqtt.entry');
let DEVICE_ID = Cfg.get('device.id');
let DEVICE_TYPE = Cfg.get('mqtt.device_type');
let MQTT_PUB_TOPIC = Cfg.get('mqtt.pub');
let MQTT_SUB_TOPIC = DEVICE_ID + '/' + Cfg.get('mqtt.sub');
let led_pin = ffi('int get_led_gpio_pin()')();
GPIO.set_mode(led_pin, GPIO.MODE_OUTPUT);
GPIO.write(2, 1);
print('Type', DEVICE_TYPE);
let device = {
  device_id: DEVICE_ID,
  topic_pub: MQTT_SUB_TOPIC,
  topic_sub: MQTT_PUB_TOPIC,
  device_type: DEVICE_TYPE,
};

let state = {
  power: 'OFF',
  brightness: 0,
  color: 0,
  lock: 'UNLOCK',
};

function event_handler(conn, ev, edata) {
  if (ev === MQTT.EV_CONNACK) {
    print('MQTT connected');
    device_init();
  } else if (ev !== 0) {
    print('MQTT unknow event:', ev);
  }
}
function report(event_id,correlation) {
  let response = {
    device_id: DEVICE_ID,
    event: 'report',
    interface: 'power',
    value: state.power,
    correlation: correlation,
    event_id: event_id,
  };
  print('Reporting');
  MQTT.pub(MQTT_PUB_TOPIC, JSON.stringify(response), 1);
  return state;
}

function connection_report() {
  if (MQTT.isConnected()) {
    print('MQTT report:', 'Is Connected');
    report('','');
  } else {
    print('MQTT report:', 'Desconnected');
  }
  // GPIO.toggle(led_pin);
}
function device_init() {
  print('Device init', JSON.stringify(device));
  MQTT.pub(MQTT_REGISTER_TOPIC, JSON.stringify(device), 1);
}

function device_event_handler(conn, topic, msg) {
  let event = JSON.parse(msg);
  let interface = event.capability;
  print('Device riceive event', msg);
  if (interface === 'power') {
    if (event.action === 'ON') {
      GPIO.write(2, 0);
    } else if (event.action === 'OFF') {
      GPIO.write(2, 1);
    }
  } else if (interface === 'brightness') {
  } else if (interface === 'color') {
  } else if (interface === 'lock') {
  } else if (interface === 'state') {
    report(event.event_id,event.action);
  } else {
    print('Device capability unknow:', event);
  }
}

MQTT.sub(MQTT_SUB_TOPIC, device_event_handler, null);
MQTT.setEventHandler(event_handler, null);
Timer.set(5000, true, connection_report, null);

RPC.addHandler('Report.status', function(args) {
  return report('');
});
