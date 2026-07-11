import * as THREE from 'three';

const FINISH_CUBE_NAME = "FinishLap";
const bestLapItem = document.getElementById("bestLap");

export function createBestLapTracker(trackModel) {
    let bestLap = null;
    let lapStartTime = performance.now();
    let wasInFinishZone = false;
    let raceStarted = false;

    let finishZoneMesh = createFinishZone(trackModel);
    if (!finishZoneMesh) {
        return;
    }

    return {
        get: () => { return bestLap; },
        update: (carPosition) => {
            let localPos = finishZoneMesh.worldToLocal(carPosition.clone());

            const inFinishZone = Math.abs(localPos.x) < 1.5 && Math.abs(localPos.y) < 1.5 && Math.abs(localPos.z) < 1.5;
            let isBestLap = false;

            if (inFinishZone && !wasInFinishZone) {
                if (!raceStarted) {
                    raceStarted = true;
                    lapStartTime = performance.now();
                } else {
                    const currentLapTime = performance.now() - lapStartTime;

                    if (bestLap === null || currentLapTime < bestLap) {
                        bestLap = currentLapTime;
                        isBestLap = true;
                    }
                    lapStartTime = performance.now();
                }
            }

            wasInFinishZone = inFinishZone;

            if (isBestLap) {
                bestLapItem.textContent = formatBestLap(bestLap);
            }
        }
    };
}

function createFinishZone(trackModel) {
    let foundEmpty = null;

    trackModel.traverse((node) => {
        if (node.name === FINISH_CUBE_NAME) {
            foundEmpty = node;
        }
    });

    if (!foundEmpty) {
        console.warn("unable to find finish zone");
        console.info("tracking best lap will not work");
        return null;
    }

    const geometry = new THREE.BoxGeometry(3, 2, 4);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: false,
        transparent: true,
        opacity: 0.0
    });

    const finishMesh = new THREE.Mesh(geometry, material);

    finishMesh.position.copy(foundEmpty.position);
    finishMesh.quaternion.copy(foundEmpty.quaternion);
    finishMesh.scale.copy(foundEmpty.scale);

    foundEmpty.parent.add(finishMesh);

    return finishMesh;
}

function formatBestLap(bestLap) {
    const minutes = Math.floor(bestLap / 60000);
    const seconds = Math.floor((bestLap % 60000) / 1000);
    const milliseconds = Math.floor(bestLap % 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
}
