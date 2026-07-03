export const CAR_MODEL = {
    path: '../../src/models/car_1/car.glb',
    state: {
        leftDoorOpen: false,
        leftWindowOpen: false,
        rightDoorOpen: false,
        rightWindowOpen: false,
        hoodOpen: false,
        wingOpen: false,
        steer: 0.0,
        throttle: 0.0,
        lowBeamsOn: false,
        highBeamsOn: false,
        runningLightsOn: false,
        ambientLightOn: false,
    },
    animations: {
        "Left_door": {
            clickable: true,
            stateKey: "leftDoorOpen",
            uiId: "checkLeftDoor",
            sounds: {
                open: 'door_open',
                close: 'door_close'
            },
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 0 },
                    angle: -45.0,
                }
            ],
            milliseconds: 1500,
        },
        "Left_door_Window_Glass": {
            clickable: true,
            stateKey: "leftWindowOpen",
            uiId: "checkLeftWindow",
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 1 },
                    angle: 9.0,
                },
                {
                    axis: { x: 1, y: 0, z: 0 },
                    angle: 1.0,
                }
            ],
            milliseconds: 3500,
        },
        "Right_door": {
            clickable: true,
            stateKey: "rightDoorOpen",
            uiId: "checkRightDoor",
            sounds: {
                open: 'door_open',
                close: 'door_close'
            },
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 0 },
                    angle: 45.0,
                }
            ],
            milliseconds: 1500,
        },
         "Right_door_Window_Glass": {
            clickable: true,
            stateKey: "rightWindowOpen",
            uiId: "checkRightWindow",
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 1 },
                    angle: 10.0,
                },
                {
                    axis: { x: 1, y: 0, z: 0 },
                    angle: -6.5,
                }
            ],
            milliseconds: 3500,
        },
        "Hood": {
            clickable: true,
            stateKey: "hoodOpen",
            uiId: "checkHood",
            sounds: {
                open: 'door_open',
                close: 'door_close'
            },
            rotations: [
                {
                    axis: { x: 1, y: 0, z: 0 },
                    angle: -30.0,
                }
            ],
            milliseconds: 1500,
        },
        "Spoiler": {
            clickable: true,
            stateKey: "wingOpen",
            uiId: "checkSpoiler",
            rotations: [
                {
                    axis: { x: 1, y: 0, z: 0 },
                    angle: 25.0,
                }
            ],
            milliseconds: 1000,
        },
        "Lights_Switch": {
            clickable: false,
            stateKey: "lowBeams",
            uiId: "checkLowBeams",
            rotations: [
                {
                    axis: { x: 0, y: 0, z: 1 },
                    angle: 112.0,
                }
            ],
            milliseconds: 300,
        },
        "wheel_LF": {
            clickable: false,
            stateKey: "steer",
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 0 },
                    angle: 0.0
                }
            ]
        },
        "wheel_RF": {
            clickable: false,
            stateKey: "steer",
            rotations: [
                {
                    axis: { x: 0, y: 1, z: 0 },
                    angle: 0.0
                }
            ]
        },
        "Moving_wheel_LR": {
            clickable: false,
        },
        "Moving_wheel_RR": {
            clickable: false,
        },
        "Moving_wheel_LF": {
            clickable: false,
        },
        "Moving_wheel_RF": {
            clickable: false,
        },
        "Steering_wheel": {
            clickable: false,
            stateKey: "steer",
            rotations: [
                {
                    axis: { x: 0, y: 0, z: 1 },
                    angle: 0.0
                }
            ]
        },
        "Throttle": {
            clickable: false,
        },
        "Brake": {
            clickable: false,
        }
    }
}
