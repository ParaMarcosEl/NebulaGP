export default function Star() {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[350]} />
        <meshStandardMaterial color={'white'} />
      </mesh>
    </>
  );
}
