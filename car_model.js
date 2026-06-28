export const CAR_MODEL = {
    path: 'car_1/car.glb',
    state: {
        leftDoorOpen: false,
        rightDoorOpen: false,
        hoodOpen: false,
        wingOpen: false,
        steer: 0.0
    },
    animations: {
        "Left_door": {
            clickable: true,
            stateKey: "leftDoorOpen",
            uiId: "checkLeftDoor",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: -45.0,
            },
            milliseconds: 1500,
        },
        "Right_door": {
            clickable: true,
            stateKey: "rightDoorOpen",
            uiId: "checkRightDoor",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 45.0,
            },
            milliseconds: 1500,
        },
        "Hood": {
            clickable: true,
            stateKey: "hoodOpen",
            uiId: "checkHood",
            rotate: {
                axis: { x: 1, y: 0, z: 0 },
                angle: -30.0,
            },
            milliseconds: 1500,
        },
        "Spoiler": {
            clickable: true,
            stateKey: "wingOpen",
            uiId: "checkSpoiler",
            rotate: {
                axis: { x: 1, y: 0, z: 0 },
                angle: 25.0,
            },
            milliseconds: 1000,
        },
        "wheel_LF": {
            clickable: false,
            stateKey: "steer",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 0.0
            }
        },
        "wheel_RF": {
            clickable: false,
            stateKey: "steer",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 0.0
            }
        },
        "Steering_wheel": {
            clickable: false,
            stateKey: "steer",
            rotate: {
                axis: { x: 0, y: 0, z: 1 },
                angle: 0.0
            }
        },
    }
}
