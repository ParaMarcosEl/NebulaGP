import { useThree } from "@react-three/fiber";
import { CubeTree } from "./CubeTree";
import { Vector3 } from 'three'
import { useMemo } from "react";
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, LinearMipMapLinearFilter } from "three";

export default function PlanetDebug({ 
    position, 
    planetSize = 5, 
    cubeSize = 16,
    lowTextPath = '/textures/icy_ground.png',
    midTextPath = '/textures/rocky_ground.png',
    highTextPath = '/textures/molten_rock.png', 
}: { 
    position?: Vector3 | [number, number, number], 
    planetSize?: number, 
    cubeSize?: number,
    lowTextPath?: string,
    midTextPath?: string,
    highTextPath?: string,
}) {
    const [lowTexture, midTexture, highTexture] = useTexture([lowTextPath, midTextPath, highTextPath]);
    [lowTexture, midTexture, highTexture].forEach(tex => {
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.minFilter = LinearMipMapLinearFilter; // optional for smoothness
    });
    const cubeTree = useMemo(() =>  new CubeTree(planetSize, cubeSize, lowTexture, midTexture, highTexture),[planetSize, cubeSize, lowTexture, midTexture, highTexture]);
    const { camera } = useThree();

    return (
        <group position={position}>
            <primitive object={cubeTree.getDynamicMeshes(camera)} />
        </group>
    );
}
