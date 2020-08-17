# aws-iot
The idea of this project is to integrate with Alexa personal assistant using amazon IOT services.

## Shadows
Shadows are a way to facilitate communication with IOT devices while maintaining state and working with api rest for the device.

## Dynamodb
Dynamodb is a nosql database used in this project to store devices and application data.

## Lambda
In this project, two lambdas functions were used, responsible for the integration with the amazon personal assistant.
- alexa-home-skill
This function receives commands coming from alexa, being in charge of requesting the call to the device and answering alexa.
- device-subscribe
This function listens for events coming from the devices, registration and status change events (physical interaction) and sends this information to alexa.

## Alexa
through their own skill, the user can interact with devices through alexa.


