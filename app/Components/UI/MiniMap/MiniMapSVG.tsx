'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/Controllers/GameController';

type ProjectPoint = { id: number; isPlayer: boolean; v: THREE.Vector3 };

type MiniMapSvgProps = {
  curve: THREE.Curve<THREE.Vector3>;
  positions: ProjectPoint[];
  svgWidth?: number;
  svgHeight?: number;
  padding?: number;
  numSegments?: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
};

export default function MiniMapSvg({
  curve,
  positions,
  svgWidth = 200,
  svgHeight = 200,
  padding = 20,
  numSegments = 100,
  strokeColor = 'blue',
  strokeWidth = 2,
  backgroundColor = 'rgba(0, 0, 0, 0)',
}: MiniMapSvgProps) {
  const points = useMemo(() => curve.getPoints(numSegments), [curve, numSegments]);

  const { pathD, viewBox, projectPoint } = useMemo(() => {
    if (points.length === 0) {
      return {
        pathD: '',
        viewBox: `0 0 ${svgWidth} ${svgHeight}`,
        projectPoint: (_: ProjectPoint) => ({ id: _.id, isPlayer: _.isPlayer, v: { x: 0, y: 0 } }),
      };
    }

    // --- Isometric projection ---
    const isoProject = (v: THREE.Vector3) => {
      const scale = Math.sqrt(2) / 2;
      const x = (v.x - v.z) * scale;
      const y = v.y + (v.x + v.z) * scale * 0.5;
      return { x, y };
    };

    const projected = points.map(isoProject);

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    for (const p of projected) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const availableWidth = svgWidth - padding * 2;
    const availableHeight = svgHeight - padding * 2;
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    const scale = Math.min(scaleX, scaleY);

    const translateX = padding + (availableWidth - width * scale) / 2 - minX * scale;
    const translateY = padding + (availableHeight - height * scale) / 2 - minY * scale;

    const d = projected
      .map((p, i) => {
        const x = p.x * scale + translateX;
        const y = p.y * scale + translateY;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const projectPoint = (point: ProjectPoint) => {
      const iso = isoProject(point.v);
      return {
        id: point.id,
        isPlayer: point.isPlayer,
        v: {
          x: iso.x * scale + translateX,
          y: iso.y * scale + translateY,
        },
      };
    };

    return {
      pathD: d,
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      projectPoint,
    };
  }, [points, svgWidth, svgHeight, padding]);

  const markers = useMemo(
    () =>
      positions.map((pos) => ({ id: pos.id, isPlayer: pos.isPlayer, v: pos.v })).map(projectPoint),
    [positions, projectPoint],
  );

  return (
    <svg width={svgWidth} height={svgHeight} viewBox={viewBox} style={{ backgroundColor }}>
      {/* Track Path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Player Marker */}
      {/* <circle cx={playerMarker.x} cy={playerMarker.y} r={5} fill="lime" stroke="black" strokeWidth={1} /> */}

      {/* Bot Markers */}
      {markers.map(({ id, v }) => {
        const playerId = useGameStore.getState().playerId;
        return (
          <circle
            key={id}
            cx={v.x}
            cy={v.y}
            r={4}
            fill={id === playerId ? 'lime' : 'red'}
            stroke="black"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}
