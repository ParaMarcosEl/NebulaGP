// import { useThree } from "@react-three/fiber"
// import { Planet as WorldPlanet } from "@hello-worlds/react"
// import { Euler, Vector3 } from "three"

// export interface workerProps {
//   worker: new () => Worker
//   numWorkers: number
// }
 
// export const Planet = () => {
//   const camera = useThree(s => s.camera)
//   const PlanetWorker = () =>
//     new Worker(new URL("./Planet.worker.ts", import.meta.url), { type: "module" })

//   return (
//     // Rotate World so it's along the x axis
//     <group
//       rotation={new Euler().setFromVector3(new Vector3(-Math.PI / 2, 0, 0))}
//     >
//       <WorldPlanet
//         position={new Vector3()}
//         radius={100}              // smaller planet first
//         minCellSize={512}           // larger minimum chunk size → fewer chunks
//         minCellResolution={16}      // lower resolution per chunk
//         lodOrigin={camera.position}
//         worker={PlanetWorker}
//         data={{
//           seed: "ytrdytdytrdyd",
//         }}
//       >
//         <meshStandardMaterial vertexColors />
//       </WorldPlanet>
//     </group>
//   )
// }