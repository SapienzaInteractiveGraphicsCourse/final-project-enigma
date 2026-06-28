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
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: -45.0,
            },
            milliseconds: 1500,
        },
        "Right_door": {
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 45.0,
            },
            milliseconds: 1500,
        },
        "Hood": {
            rotate: {
                axis: { x: 1, y: 0, z: 0 },
                angle: -30.0,
            },
            milliseconds: 1500,
        },
        "Spoiler": {
            rotate: {
                axis: { x: 1, y: 0, z: 0 },
                angle: 25.0,
            },
            milliseconds: 1000,
        },
        "wheel_LF": {
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 0.0
            }
        },
        "wheel_RF": {
            rotate: {
                axis: { x: 0, y: 1, z: 0 },
                angle: 0.0
            }
        },
        "Steering_wheel": {
            rotate: {
                axis: { x: 0, y: 0, z: 1 },
                angle: 0.0
            }
        },
    }
}
