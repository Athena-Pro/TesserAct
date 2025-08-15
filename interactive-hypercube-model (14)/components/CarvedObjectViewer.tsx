import React, { useState, useEffect, useRef } from 'react';
import { Point3D } from '../lib/polytopes';

interface CarvedObjectViewerProps {
  carvedSlices: Point3D[][];
}

interface Point2D {
  x: number;
  y: number;
}

const CarvedObjectViewer: React.FC<CarvedObjectViewerProps> = ({ carvedSlices }) => {
  const [points, setPoints] = useState<{ point: Point2D; color: string }[]>([]);
  const rotationAngles = useRef({ x: 0, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number | null>(null);
  const zoom = useRef(0.8);

  const all3DPoints = useRef<{ point: Point3D; color: string }[]>([]);

  useEffect(() => {
    const totalSlices = carvedSlices.length;
    all3DPoints.current = carvedSlices.flatMap((slice, sliceIndex) => {
      const hue = 240 * (sliceIndex / totalSlices); // Blue to Red gradient
      const color = `hsl(${hue}, 90%, 65%)`;
      return slice.map(point => ({ point, color }));
    });
  }, [carvedSlices]);

  useEffect(() => {
    const animate = () => {
      const scale = 200 * zoom.current;
      const cosX = Math.cos(rotationAngles.current.x);
      const sinX = Math.sin(rotationAngles.current.x);
      const cosY = Math.cos(rotationAngles.current.y);
      const sinY = Math.sin(rotationAngles.current.y);

      const projectedPoints = all3DPoints.current.map(p => {
        // Rotate around Y axis
        let x = p.point.x * cosY - p.point.z * sinY;
        let z = p.point.x * sinY + p.point.z * cosY;
        
        // Rotate around X axis
        let y = p.point.y * cosX - z * sinX;
        z = p.point.y * sinX + z * cosX;

        const perspective = 1.5 / (1.5 - z * 0.5);
        
        return {
          point: {
            x: x * scale * perspective,
            y: y * scale * perspective,
          },
          color: p.color,
        };
      });

      setPoints(projectedPoints);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    rotationAngles.current.y += dx * 0.005;
    rotationAngles.current.x += dy * 0.005;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    zoom.current = Math.max(0.1, Math.min(3, zoom.current + (e.deltaY * -0.001)));
  };

  return (
    <div
      className={`relative w-full h-full bg-transparent flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      role="application"
      aria-label="An interactive 3D view of the carved object."
    >
      <div className="absolute top-4 text-center text-lg text-cyan-300 pointer-events-none">
        Carved Object Viewer
        <p className="text-sm text-gray-400">Drag to rotate, scroll to zoom.</p>
      </div>
      <svg width="100%" height="100%" viewBox="-800 -800 1600 1600">
        <defs>
            <filter id="carvedBloom" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" />
            </filter>
        </defs>
        <g filter="url(#carvedBloom)">
            {points.map((p, i) => (
                <circle key={i} cx={p.point.x} cy={p.point.y} r="2.5" fill={p.color} />
            ))}
        </g>
      </svg>
    </div>
  );
};

export default CarvedObjectViewer;