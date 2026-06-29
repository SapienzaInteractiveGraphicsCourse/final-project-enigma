import * as THREE from 'three';

export function CubeMapReflections(car, scene, renderer) {
    let carRoot = null;
    if (car) {
        carRoot = car.scene ? car.scene : car;
    }

    if (!carRoot || !carRoot.position) {

        scene.children.forEach((child) => {
            if (child.isGroup && !child.name.toLowerCase().includes('env') && !child.name.toLowerCase().includes('garage')) {
                carRoot = child;
            }
        });
    }

    if (!carRoot || !carRoot.position) {
        return;
    }

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, { 
        format: THREE.RGBAFormat, 
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter 
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    
    cubeCamera.position.copy(carRoot.position);
    cubeCamera.position.y += 0.8;
    scene.add(cubeCamera);

    scene.updateMatrixWorld(true);

    requestAnimationFrame(() => {
        carRoot.visible = false;
        cubeCamera.update(renderer, scene);
        carRoot.visible = true;

        carRoot.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                    child.material.envMap = cubeRenderTarget.texture;
                    child.material.envMapIntensity = 2.0; 
                    child.material.needsUpdate = true;
                }
            }
        });
    });
}