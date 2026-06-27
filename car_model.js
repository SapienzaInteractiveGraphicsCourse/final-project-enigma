export const CAR_MODEL = {
    path: 'car_1/car.glb',
    state: {
        leftDoorOpen: false,
        rightDoorOpen: false,
        hoodOpen: false,
        steer: 0.0
    },
    animations: {
        "Left_door": {
            clickable: true,
            stateKey: "leftDoorOpen",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: -45.0,
            },
            milliseconds: 3000,
        },
        "Right_door": {
            clickable: true,
            stateKey: "rightDoorOpen",
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 45.0,
            },
            milliseconds: 3000,
        },
        "Hood": {
            clickable: true,
            stateKey: "hoodOpen",
            rotate: {
                axis: { x: 1, y: 0, z: 0 },
                angle: -30.0,
            },
            milliseconds: 3000,
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
    }
}
