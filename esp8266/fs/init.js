load('api_aws.js');
load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_rpc.js');

let DEVICE_ID = Cfg.get('device.id');
// let DEVICE_TYPE = Cfg.get('device_type');
let DEVICE_TYPE = 'smartlock';
let MQTT_EVENT_TOPIC = Cfg.get('mqtt_events');
let led_pin = ffi('int get_led_gpio_pin()')();

let properties = {
  power: true,
  color: false,
  brightness: false,
  lock: false,
};
let buttons = {
  power: false,
  color: false,
  brightness: false,
  lock: false,
};

let state = {};
let rebooted = false;
let online = false;

GPIO.set_mode(led_pin, GPIO.MODE_OUTPUT);

let register_device = function() {
  if (DEVICE_TYPE === 'light') {
    properties.power = true;
    buttons.power = true;
    state = {
      power: 'OFF',
    };
  } else if (DEVICE_TYPE === 'light_rgb') {
    properties.power = true;
    properties.brightness = true;
    properties.color = true;
    state = {
      power: 'OFF',
      color: {
        hue: 0,
        saturation: 0,
        brightness: 0,
      },
      brightness: 0,
    };
  } else if (DEVICE_TYPE === 'light_brightness') {
    properties.power = true;
    properties.brightness = true;
    state = {
      power: 'OFF',
      brightness: 0,
    };
  } else if (DEVICE_TYPE === 'smartlock') {
    buttons.lock = true;
    properties.lock = true;
    state = {
      lock: 'UNLOCKED',
    };
  }
  let device = {
    event: 'register_device',
    device_id: DEVICE_ID,
    properties: properties,
    buttons: buttons,
    device_template: DEVICE_TYPE,
    topic_events: MQTT_EVENT_TOPIC,
  };
  print('Register', JSON.stringify(device));
  MQTT.pub(MQTT_EVENT_TOPIC, JSON.stringify(device), 0);
};

let physical_interaction = function(property) {
  let device = {
    event: 'physical_interaction',
    device_id: DEVICE_ID,
    property: property,
    state: state,
  };
  MQTT.pub(MQTT_EVENT_TOPIC, JSON.stringify(device), 0);
};
let reportState = function() {
  if (online) {
    Shadow.update(0, state);
  }
};

Timer.set(
  5000,
  Timer.REPEAT,
  function() {
    reportState();
  },
  null
);

let setPower = function() {
  GPIO.write(led_pin, state.power === 'ON' ? true : false);
};

let setColor = function() {
  // TODO: implementar alteração de cor
  print('Change color');
};

let setBrightness = function() {
  // TODO: implementar alteração de cor
  print('Change brightness');
};

let setLock = function() {
  // TODO: implementar tranca porta
  GPIO.write(5, state.lock === 'UNLOCKED' ? false : true);
};

Shadow.addHandler(function(event, obj) {
  if (event === 'UPDATE_DELTA') {
    for (let key in obj) {
      if (key === 'power' && properties.power) {
        state.power = obj.power;
        reportState();
        setPower();
      } else if (key === 'brightness' && properties.brightness) {
        state.brightness = obj.brightness;
        setBrightness();
        reportState();
      } else if (key === 'color' && properties.color) {
        state.color = {
          hue: obj.color.hue,
          saturation: obj.color.saturation,
          brightness: obj.color.brightness,
        };
        reportState();
        setColor();
      } else if (key === 'lock' && properties.lock) {
        state.lock = obj.lock;
        setLock();
        reportState();
      } else if (key === 'reboot') {
        rebooted = true;
        Timer.set(
          750,
          0,
          function() {
            Sys.reboot(500);
          },
          null
        );
      }
    }
    print('Update', event, JSON.stringify(obj));
  }
});
GPIO.set_button_handler(
  0,
  GPIO.PULL_UP,
  GPIO.INT_EDGE_NEG,
  20,
  function() {
    print('Physical interaction: Power');
    state.power = state.power === 'ON' ? 'OFF' : 'ON';
    setPower();
    reportState();
    if (MQTT.isConnected()) {
      physical_interaction('power');
    }
  },
  null
);
if (buttons.lock) {
  GPIO.set_button_handler(
    0,
    GPIO.PULL_UP,
    GPIO.INT_EDGE_NEG,
    20,
    function() {
      print('Physical interaction: lock');
      state.lock = state.lock === 'UNLOCKED' ? 'LOCKED' : 'UNLOCKED';
      setLock();
      if (MQTT.isConnected()) {
        physical_interaction('lock');
      }
    },
    null
  );
}

Event.on(
  Event.CLOUD_CONNECTED,
  function() {
    online = true;
    Shadow.update(0, { ram_total: Sys.total_ram() });
    if (MQTT.isConnected()) {
      register_device();
    }
  },
  null
);

Event.on(
  Event.CLOUD_DISCONNECTED,
  function() {
    online = false;
  },
  null
);
