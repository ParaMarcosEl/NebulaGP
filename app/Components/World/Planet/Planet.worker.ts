// import {
//   ChunkGenerator3Initializer,
//   ColorArrayWithAlpha,
//   createThreadedPlanetWorker,
//   Noise,
//   NOISE_TYPES,
// } from "@hello-worlds/planets"
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { Color, MathUtils } from "three"
 
// export type ThreadParams = {
//   seed: string
// }
 
// const heightGenerator: ChunkGenerator3Initializer<ThreadParams, number> = ({
//   data: { seed },
// }) => {
//   const warp = new Noise({
//     octaves: 2,
//     seed,
//     height: 1000,
//     scale: 3000,
//     noiseType: NOISE_TYPES.BILLOWING,
//   })
 
//   const mountains = new Noise({
//     seed,
//     height: 2000,
//     scale: 3000,
//   })
 
//   return ({ input }) => {
//     const w = warp.get(input.x, input.y, input.z)
//     const m = mountains.get(input.x + w, input.y + w, input.z + w)
//     return m
//   }
// }
 
// const colorGenerator: ChunkGenerator3Initializer<
//   ThreadParams,
//   Color | ColorArrayWithAlpha
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// > = props => {
//   const color = new Color(0x9fc164)
//   return () => {
//     return color
//   }
// }
 
// const worker = createThreadedPlanetWorker<ThreadParams>({
//   heightGenerator,
//   colorGenerator,
// })

// export default worker;