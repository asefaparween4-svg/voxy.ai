
import React, { useEffect, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { ProjectionData, ProjectionType } from '../types';
import { Activity, List, BarChart2, Zap, Database, Monitor, Image as ImageIcon, Settings, PenTool, ZoomIn, ZoomOut, Move, Box, PlayCircle, PauseCircle, Layers, Maximize, RotateCcw, Crosshair, Aperture, Download, FileBox } from 'lucide-react';

interface ProjectionDisplayProps {
  projection: ProjectionData | null;
}

// --- 3D Engine Constants ---
const BASE_PERSPECTIVE = 1000;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// --- 3D Engine Helpers ---
interface Point3D { x: number; y: number; z: number; }
interface Shape3D {
  basePoints: Point3D[];
  edges: [number, number][];
  faces: number[][]; // Indices of points forming faces
  color: string;
  opacity?: number;
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
  label?: string; 
  animation?: {
    type: 'rotate' | 'oscillate' | 'compress' | 'flow';
    axis?: 'x' | 'y' | 'z';
    speed?: number;
    amplitude?: number;
  };
  shapeType?: string; // For export logic
}

// Standard rotation matrix
const rotatePoint = (point: Point3D, rot: Point3D): Point3D => {
  let { x, y, z } = point;
  
  // Rotate X
  if (rot.x !== 0) {
    const cosX = Math.cos(rot.x);
    const sinX = Math.sin(rot.x);
    const y1 = y * cosX - z * sinX;
    const z1 = z * cosX + y * sinX;
    y = y1; z = z1;
  }

  // Rotate Y
  if (rot.y !== 0) {
    const cosY = Math.cos(rot.y);
    const sinY = Math.sin(rot.y);
    const x1 = x * cosY + z * sinY;
    const z2 = z * cosY - x * sinY;
    x = x1; z = z2;
  }

  // Rotate Z
  if (rot.z !== 0) {
    const cosZ = Math.cos(rot.z);
    const sinZ = Math.sin(rot.z);
    const x2 = x * cosZ - y * sinZ;
    const y2 = y * cosZ + x * sinZ;
    x = x2; y = y2;
  }

  return { x, y, z };
};

// --- Shape Generators (Optimized for Performance) ---

const createCube = (): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
  const s = 50; 
  const points = [
    {x: -s, y: -s, z: -s}, {x: s, y: -s, z: -s},
    {x: s, y: s, z: -s}, {x: -s, y: s, z: -s},
    {x: -s, y: -s, z: s}, {x: s, y: -s, z: s},
    {x: s, y: s, z: s}, {x: -s, y: s, z: s}
  ];
  const edges: [number, number][] = [
    [0,1], [1,2], [2,3], [3,0], // Front
    [4,5], [5,6], [6,7], [7,4], // Back
    [0,4], [1,5], [2,6], [3,7]  // Connectors
  ];
  const faces = [
    [0, 1, 2, 3], // Front
    [5, 4, 7, 6], // Back
    [4, 0, 3, 7], // Left
    [1, 5, 6, 2], // Right
    [3, 2, 6, 7], // Top
    [4, 5, 1, 0]  // Bottom
  ];
  return { points, edges, faces };
};

const createCylinder = (segments = 12): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
   const r = 50;
   const h = 50;
   const points: Point3D[] = [];
   const edges: [number, number][] = [];
   const faces: number[][] = [];
   
   // Points
   for(let i=0; i<segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      points.push({ x, y: -h, z }); // Top 
      points.push({ x, y: h, z });  // Bottom
   }
   
   // Edges & Side Faces
   for(let i=0; i<segments; i++) {
      const topCurrent = i*2;
      const bottomCurrent = i*2+1;
      const topNext = ((i + 1) % segments) * 2;
      const bottomNext = ((i + 1) % segments) * 2 + 1;

      edges.push([topCurrent, topNext]);         
      edges.push([bottomCurrent, bottomNext]);     
      edges.push([topCurrent, bottomCurrent]);
      
      // Side Face (Quad)
      faces.push([topCurrent, topNext, bottomNext, bottomCurrent]);
   }

   // Caps
   const topCap = [];
   const bottomCap = [];
   for(let i=0; i<segments; i++) {
     topCap.push(i*2);
     bottomCap.push((segments - 1 - i)*2 + 1);
   }
   faces.push(topCap);
   faces.push(bottomCap);

   return { points, edges, faces };
};

const createSphere = (segments = 12): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
  const r = 50;
  const points: Point3D[] = [];
  const edges: [number, number][] = [];
  const faces: number[][] = [];
  
  const rings = 8;
  for(let lat=0; lat<=rings; lat++) {
    const phi = (lat / rings) * Math.PI;
    const y = Math.cos(phi) * r;
    const ringR = Math.sin(phi) * r;
    
    for(let i=0; i<segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * ringR;
      const z = Math.sin(theta) * ringR;
      points.push({x, y, z});
      
      // Connectivity
      if (lat < rings) {
        const current = lat * segments + i;
        const next = lat * segments + ((i + 1) % segments);
        const below = (lat + 1) * segments + i;
        const belowNext = (lat + 1) * segments + ((i + 1) % segments);
        
        edges.push([current, next]);
        edges.push([current, below]);
        
        faces.push([current, next, belowNext, below]);
      }
    }
  }
  return { points, edges, faces };
};

const createCone = (segments = 12): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
    const r = 50; 
    const h = 50;
    const points: Point3D[] = [];
    const edges: [number, number][] = [];
    const faces: number[][] = [];
    
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        points.push({x, y: h, z});
    }
    points.push({x: 0, y: -h, z: 0}); // Tip is last
    const tipIdx = points.length - 1;

    for(let i=0; i<segments; i++) {
        const next = (i + 1) % segments;
        edges.push([i, next]); 
        edges.push([i, tipIdx]);
        
        // Side Triangle
        faces.push([i, next, tipIdx]);
    }
    // Base Cap
    const base = [];
    for(let i=segments-1; i>=0; i--) base.push(i);
    faces.push(base);

    return { points, edges, faces };
};

const createTorus = (segments = 16, tubeSegments = 8): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
    const R = 40;
    const tubeR = 15;
    const points: Point3D[] = [];
    const edges: [number, number][] = [];
    const faces: number[][] = [];
    
    for(let i=0; i<segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        for(let j=0; j<tubeSegments; j++) {
            const phi = (j / tubeSegments) * Math.PI * 2;
            const x = (R + tubeR * Math.cos(phi)) * Math.cos(theta);
            const y = tubeR * Math.sin(phi);
            const z = (R + tubeR * Math.cos(phi)) * Math.sin(theta);
            
            points.push({x, y, z});
            
            const current = i * tubeSegments + j;
            const nextTube = i * tubeSegments + ((j + 1) % tubeSegments);
            const nextSeg = ((i + 1) % segments) * tubeSegments + j;
            const diag = ((i + 1) % segments) * tubeSegments + ((j + 1) % tubeSegments);
            
            edges.push([current, nextTube]);
            edges.push([current, nextSeg]);
            
            faces.push([current, nextSeg, diag, nextTube]);
        }
    }
    return { points, edges, faces };
};

const createGear = (teeth = 12): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
  const r = 50;
  const h = 20;
  const points: Point3D[] = [];
  const edges: [number, number][] = [];
  const faces: number[][] = [];
  
  const outerR = r;
  const innerR = r * 0.85;
  const segments = teeth * 2; 

  // Generate Outline Points
  for(let i=0; i<segments; i++) {
     const theta = (i / segments) * Math.PI * 2;
     const curR = (i % 2 === 0) ? outerR : innerR;
     
     const x = Math.cos(theta) * curR;
     const z = Math.sin(theta) * curR;
     
     points.push({ x, y: -h/2, z }); // Front
     points.push({ x, y: h/2, z });  // Back
     
     const currentFront = i*2;
     const currentBack = i*2+1;
     const nextFront = ((i+1)%segments)*2;
     const nextBack = ((i+1)%segments)*2+1;
     
     edges.push([currentFront, nextFront], [currentBack, nextBack], [currentFront, currentBack]);
     
     // Side Face
     faces.push([currentFront, nextFront, nextBack, currentBack]);
  }
  return { points, edges, faces };
}

const createSpring = (coils = 8): { points: Point3D[], edges: [number, number][], faces: number[][] } => {
    const r = 30;
    const h = 100;
    const points: Point3D[] = [];
    const edges: [number, number][] = [];
    
    const resolution = 12; 
    const totalPoints = coils * resolution;
    
    for(let i=0; i<=totalPoints; i++) {
        const pct = i / totalPoints;
        const theta = pct * coils * Math.PI * 2;
        
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = (pct - 0.5) * h;
        
        points.push({x, y, z});
        if(i > 0) edges.push([i-1, i]);
    }
    return { points, edges, faces: [] }; // Springs are rendered as neon lines
}

// --- OBJ Export Helper ---
const exportToOBJ = (sceneObjects: Shape3D[]) => {
  let output = "# JARVIS 3D EXPORT\n# Compatible with Tinkercad, Blender, MeshLab\n\n";
  let vertexOffset = 1;

  sceneObjects.forEach((obj, idx) => {
    output += `o Object_${idx}_${obj.shapeType || 'Part'}\n`;
    
    const worldPoints = obj.basePoints.map(p => {
       // Scale
       let tx = p.x * obj.scale.x;
       let ty = p.y * obj.scale.y;
       let tz = p.z * obj.scale.z;

       // Rotate
       const r = rotatePoint({x: tx, y: ty, z: tz}, obj.rotation);
       
       // Translate
       return {
         x: r.x + obj.position.x,
         y: r.y + obj.position.y,
         z: r.z + obj.position.z
       };
    });

    worldPoints.forEach(v => {
      output += `v ${v.x/50} ${v.y/50} ${v.z/50}\n`;
    });

    obj.faces.forEach(face => {
      output += "f ";
      face.forEach(vIdx => {
        output += `${vIdx + vertexOffset} `;
      });
      output += "\n";
    });

    vertexOffset += worldPoints.length;
    output += "\n";
  });

  const blob = new Blob([output], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jarvis_model_export_${Date.now()}.obj`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


// --- Tech HUD Component ---
const HologramHUD = ({ onExport }: { onExport: () => void }) => (
  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-lg">
    {/* Scanlines */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none"></div>
    <div className="absolute inset-0 bg-gradient-to-t from-sky-500/5 to-transparent animate-pulse pointer-events-none"></div>

    {/* Top Bar */}
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
      <div className="flex flex-col gap-1">
         <div className="flex items-center gap-2">
            <Aperture size={14} className="text-sky-400 animate-spin-slow" />
            <div className="text-sky-400 font-tech text-[10px] tracking-[0.2em] border-l-2 border-sky-500 pl-2">
                SIMULATION.CORE.ACTIVE
            </div>
         </div>
         <div className="text-sky-600 font-mono text-[9px] pl-6">
            PHYSICS: ENABLED | RENDER: OPTIMIZED | TARGET: LOCKED
         </div>
      </div>
      <div className="flex gap-1 items-center">
         <div className="text-[8px] font-mono text-sky-700 mr-2">SYS_RDY</div>
         <div className="w-16 h-1 bg-sky-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-sky-500/50 w-full animate-[shimmer_2s_infinite]"></div>
         </div>
         <div className="w-4 h-1 bg-sky-500/50"></div>
         <div className="w-1 h-1 bg-sky-500"></div>
      </div>
    </div>

    {/* Side Data Columns */}
    <div className="absolute top-1/2 -translate-y-1/2 left-4 flex flex-col gap-8 hidden md:flex">
       <div className="flex gap-2 items-center opacity-70">
          <div className="w-0.5 h-12 bg-gradient-to-b from-transparent via-sky-500 to-transparent"></div>
          <div className="text-[8px] font-mono text-sky-500 writing-vertical-rl tracking-widest">ROT_VELOCITY</div>
       </div>
       <div className="flex gap-2 items-center opacity-70">
          <div className="w-0.5 h-12 bg-gradient-to-b from-transparent via-sky-500 to-transparent"></div>
          <div className="text-[8px] font-mono text-sky-500 writing-vertical-rl tracking-widest">TEMP_GRADIENT</div>
       </div>
    </div>

    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2 items-end hidden md:flex opacity-60">
        {[85, 92, 44, 12, 67].map((val, i) => (
            <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-sky-600">0x{val}</span>
                <div className="w-8 h-1 bg-sky-900 rounded-sm overflow-hidden">
                    <div className="h-full bg-sky-500" style={{width: `${val}%`}}></div>
                </div>
            </div>
        ))}
    </div>

    {/* Target Brackets */}
    <div className="absolute top-1/4 left-1/4 w-8 h-8 border-t border-l border-sky-500/40"></div>
    <div className="absolute top-1/4 right-1/4 w-8 h-8 border-t border-r border-sky-500/40"></div>
    <div className="absolute bottom-1/4 left-1/4 w-8 h-8 border-b border-l border-sky-500/40"></div>
    <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-b border-r border-sky-500/40"></div>

    {/* Export Button (Top Right Absolute) */}
    <div className="absolute top-20 right-4 pointer-events-auto">
      <button 
        onClick={onExport}
        className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded text-[10px] font-tech text-sky-400 transition-colors group"
        title="Export to Tinkercad (OBJ)"
      >
        <FileBox size={14} />
        <span className="group-hover:text-sky-300">EXPORT_CAD</span>
      </button>
    </div>

    {/* Crosshair Center */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
        <Crosshair size={300} strokeWidth={0.5} className="text-sky-300" />
    </div>

    {/* Bottom Bar */}
    <div className="absolute bottom-4 left-4 right-4 border-t border-sky-900/30 pt-2 flex justify-between items-end">
       <div className="flex flex-col gap-0.5">
           <div className="text-[9px] font-tech text-sky-600">
              JARVIS_ENGINE_V9.3 [WEBGL_OPTIMIZED]
           </div>
           <div className="text-[8px] font-mono text-sky-800">
              CONTROLS: L-CLICK ROTATE SCENE | DRAG OBJ TO MOVE | CTRL+DRAG TO ROTATE OBJ | R-CLICK PAN
           </div>
       </div>
       <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-pulse delay-75"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500/40 animate-pulse delay-150"></div>
       </div>
    </div>
  </div>
);


const HologramCanvas: React.FC<{ data: any }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  
  // Undo/Redo History
  const historyRef = useRef<{
      objects: Shape3D[], 
      camera: {rotX: number, rotY: number, rotZ: number, panX: number, panY: number, zoom: number},
      springState: {displacement: number}
  }[]>([]);
  const historyIndexRef = useRef(-1);
  const hasInteractionRef = useRef(false);

  // Interactive State
  const rotationRef = useRef({ x: 0.3, y: -0.5, z: 0 }); 
  const panRef = useRef({ x: 0, y: 0 }); // Pan Offset
  const zoomRef = useRef(1.2);
  const isDragging = useRef(false);
  const interactionMode = useRef<'rotate' | 'pan' | 'interact' | 'manipulate'>('rotate');
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Hover & Selection State
  const activeObjRef = useRef({ hoveredIdx: -1, selectedIdx: -1 });

  // Physics State for Spring
  const springState = useRef({
      activeIdx: -1, // Index of the spring being manipulated
      displacement: 0, // Current physical stretch/compression
      velocity: 0,
      isDragging: false
  });
  
  // Cache screen positions for hit testing
  const objectScreenPositions = useRef<{idx: number, x: number, y: number, r: number, type: string, bbox?: {minX: number, minY: number, maxX: number, maxY: number}}[]>([]);

  const [isExploded, setIsExploded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timeRef = useRef<number>(0);

  const sceneObjects = useRef<Shape3D[]>([]);
  const particles = useRef<{x:number, y:number, z:number, vy: number, vx: number, vz: number}[]>([]);

  // History Helper
  const saveHistory = () => {
      // Remove future history if we were in the middle
      if (historyIndexRef.current < historyRef.current.length - 1) {
          historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      }
      
      const snapshot = {
          objects: JSON.parse(JSON.stringify(sceneObjects.current)),
          camera: { ...rotationRef.current, panX: panRef.current.x, panY: panRef.current.y, zoom: zoomRef.current },
          springState: { displacement: springState.current.displacement }
      };
      
      historyRef.current.push(snapshot);
      historyIndexRef.current++;
      // Limit history size
      if (historyRef.current.length > 20) {
          historyRef.current.shift();
          historyIndexRef.current--;
      }
      hasInteractionRef.current = false;
  };

  const undo = () => {
      if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          restoreState(historyRef.current[historyIndexRef.current]);
      }
  };

  const redo = () => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          restoreState(historyRef.current[historyIndexRef.current]);
      }
  };

  const restoreState = (snapshot: any) => {
      sceneObjects.current = JSON.parse(JSON.stringify(snapshot.objects));
      rotationRef.current = { x: snapshot.camera.rotX, y: snapshot.camera.rotY, z: snapshot.camera.rotZ || 0 };
      panRef.current = { x: snapshot.camera.panX || 0, y: snapshot.camera.panY || 0 };
      zoomRef.current = snapshot.camera.zoom;
      springState.current.displacement = snapshot.springState.displacement;
  };

  // Export handler
  const handleExport = () => {
    exportToOBJ(sceneObjects.current);
  };

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Correct for canvas offset
    const rect = canvasRef.current?.getBoundingClientRect();
    const mouseX = rect ? clientX - rect.left : clientX;
    const mouseY = rect ? clientY - rect.top : clientY;
    
    lastMousePos.current = { x: clientX, y: clientY };

    // Check for Right Click or Shift key for Panning
    const isRightClick = 'button' in e && e.button === 2;
    const isShift = 'shiftKey' in e && e.shiftKey;
    
    if (isRightClick || isShift) {
        interactionMode.current = 'pan';
    } else {
        // HIT TEST
        const hit = objectScreenPositions.current.find(obj => {
            // Priority Check: Inside bounding box if available, else radius
            if (obj.bbox) {
              return mouseX >= obj.bbox.minX && mouseX <= obj.bbox.maxX && mouseY >= obj.bbox.minY && mouseY <= obj.bbox.maxY;
            }
            const dist = Math.hypot(mouseX - obj.x, mouseY - obj.y);
            return dist < 40;
        });

        if (hit) {
            // Select object
            activeObjRef.current.selectedIdx = hit.idx;

            // Specific Interaction Logic
            if (hit.type === 'spring' || hit.type === 'helix') {
                interactionMode.current = 'interact'; // Physics spring
                springState.current.activeIdx = hit.idx;
                springState.current.isDragging = true;
            } else {
                interactionMode.current = 'manipulate'; // Move/Rotate Object
            }
        } else {
            // Deselect if clicking empty space
            activeObjRef.current.selectedIdx = -1;
            interactionMode.current = 'rotate';
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const rect = canvasRef.current?.getBoundingClientRect();
    const mouseX = rect ? clientX - rect.left : clientX;
    const mouseY = rect ? clientY - rect.top : clientY;

    // --- Hover Detection (Always active) ---
    const hit = objectScreenPositions.current.find(obj => {
        if (obj.bbox) {
           return mouseX >= obj.bbox.minX && mouseX <= obj.bbox.maxX && mouseY >= obj.bbox.minY && mouseY <= obj.bbox.maxY;
        }
        const dist = Math.hypot(mouseX - obj.x, mouseY - obj.y);
        return dist < 40;
    });
    activeObjRef.current.hoveredIdx = hit ? hit.idx : -1;

    // --- Dragging Logic ---
    if (!isDragging.current) return;
    hasInteractionRef.current = true;

    const deltaX = clientX - lastMousePos.current.x;
    const deltaY = clientY - lastMousePos.current.y;

    if (interactionMode.current === 'rotate') {
        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
    } else if (interactionMode.current === 'pan') {
        panRef.current.x += deltaX;
        panRef.current.y += deltaY;
    } else if (interactionMode.current === 'interact') {
        const sensitivity = 0.01; 
        springState.current.displacement += deltaY * sensitivity;
        springState.current.displacement = Math.max(-0.8, Math.min(1.5, springState.current.displacement));
    } else if (interactionMode.current === 'manipulate' && activeObjRef.current.selectedIdx !== -1) {
        const obj = sceneObjects.current[activeObjRef.current.selectedIdx];
        const isCtrl = 'ctrlKey' in e && e.ctrlKey || 'metaKey' in e && e.metaKey;

        if (isCtrl) {
            // Local Rotation
            obj.rotation.y += deltaX * 0.02;
            obj.rotation.x += deltaY * 0.02;
        } else {
            // Translation (Simple Screen-Plane Approximation)
            const speed = 0.5;
            obj.position.x += deltaX * speed;
            obj.position.y += deltaY * speed;
        }
    }

    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (interactionMode.current === 'interact') {
        springState.current.isDragging = false;
    }
    interactionMode.current = 'rotate'; // Reset default
    
    // Save history only if there was meaningful interaction
    if (hasInteractionRef.current) {
        saveHistory();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    zoomRef.current = Math.max(0.4, Math.min(3.5, zoomRef.current - e.deltaY * 0.001));
  };

  const resetView = () => {
    rotationRef.current = { x: 0.3, y: -0.5, z: 0 };
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.2;
    setIsExploded(false);
    springState.current.displacement = 0;
    springState.current.velocity = 0;
    activeObjRef.current = { hoveredIdx: -1, selectedIdx: -1 };
    saveHistory(); // Save the reset state
  };

  // --- Scene Initialization ---
  useEffect(() => {
    const elements = data.elements || [];
    sceneObjects.current = elements.map((el: any) => {
      let geo = { points: [] as Point3D[], edges: [] as [number, number][], faces: [] as number[][] };
      
      if (el.shape === 'cube' || el.shape === 'box') geo = createCube();
      else if (el.shape === 'cylinder') geo = createCylinder();
      else if (el.shape === 'sphere') geo = createSphere();
      else if (el.shape === 'cone') geo = createCone();
      else if (el.shape === 'torus' || el.shape === 'ring') geo = createTorus();
      else if (el.shape === 'gear') geo = createGear(el.teeth || 12);
      else if (el.shape === 'spring' || el.shape === 'helix') geo = createSpring(el.coils || 8);
      
      const pos = el.position || [0,0,0];
      const rot = el.rotation || [0,0,0];
      const scl = el.scale || [1,1,1];
      
      return {
        basePoints: geo.points,
        edges: geo.edges,
        faces: geo.faces || [],
        color: el.color || '#38bdf8',
        opacity: el.opacity ?? 0.8,
        position: { x: pos[0]*50, y: pos[1]*50, z: pos[2]*50 },
        rotation: { x: rot[0], y: rot[1], z: rot[2] },
        scale: { x: scl[0], y: scl[1], z: scl[2] },
        label: el.label,
        animation: el.animation,
        shapeType: el.shape
      } as Shape3D;
    });

    // Initialize history
    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory();

    // Initialize particles
    const hasFlow = elements.some((el:any) => el.animation?.type === 'flow');
    if (hasFlow) {
        particles.current = Array.from({length: 60}, () => ({ // Reduced count
            x: (Math.random() - 0.5) * 40,
            y: (Math.random() - 0.5) * 100,
            z: (Math.random() - 0.5) * 40,
            vy: 1 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 0.5,
            vz: (Math.random() - 0.5) * 0.5
        }));
    } else {
        particles.current = [];
    }
  }, [data]);

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      if (!isPaused) {
        timeRef.current = time;
      }
      const t = timeRef.current * 0.001;

      // Auto Rotation (Idle)
      if (!isDragging.current && !isPaused && springState.current.activeIdx === -1) {
         rotationRef.current.y += 0.0005; 
      }

      // --- Spring Physics Simulation ---
      if (!springState.current.isDragging && Math.abs(springState.current.displacement) > 0.001) {
          const k = 0.1; // Spring stiffness
          const c = 0.08; // Damping
          const force = -k * springState.current.displacement;
          const acceleration = force;
          springState.current.velocity += acceleration;
          springState.current.velocity *= (1 - c); // Damping
          springState.current.displacement += springState.current.velocity;
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const cx = CANVAS_WIDTH / 2 + panRef.current.x;
      const cy = CANVAS_HEIGHT / 2 + panRef.current.y;
      const perspective = BASE_PERSPECTIVE * zoomRef.current;
      
      const lightDir = { x: 0.5, y: -0.8, z: 0.5 };
      const len = Math.sqrt(lightDir.x**2 + lightDir.y**2 + lightDir.z**2);
      lightDir.x /= len; lightDir.y /= len; lightDir.z /= len;

      const renderList: { zIndex: number, draw: () => void }[] = [];
      const labelsToRender: { x: number, y: number, text: string, highlighted: boolean }[] = [];
      const highlightsToRender: { minX: number, minY: number, maxX: number, maxY: number, color: string }[] = [];
      
      objectScreenPositions.current = [];

      // 1. Process Objects
      sceneObjects.current.forEach((obj, objIdx) => {
         const isHovered = activeObjRef.current.hoveredIdx === objIdx;
         const isSelected = activeObjRef.current.selectedIdx === objIdx;
         const isHighlighted = isHovered || isSelected;

         // --- Animation Logic ---
         let animRot = { x: 0, y: 0, z: 0 };
         let animPos = { x: 0, y: 0, z: 0 };
         let animScale = { x: 1, y: 1, z: 1 };

         if ((obj.shapeType === 'spring' || obj.shapeType === 'helix') && springState.current.activeIdx === objIdx) {
            animScale.y = 1 + springState.current.displacement;
         } else if ((obj.shapeType === 'spring' || obj.shapeType === 'helix') && springState.current.activeIdx === -1 && obj.animation?.type === 'oscillate') {
             if (Math.abs(springState.current.displacement) > 0.01) {
                 animScale.y = 1 + springState.current.displacement;
             }
         }

         if (obj.animation && !isPaused) {
             const speed = obj.animation.speed || 1;
             if (obj.animation.type === 'rotate') {
                 const axis = obj.animation.axis || 'z';
                 animRot[axis] = t * speed;
             } else if (obj.animation.type === 'oscillate') {
                 const axis = obj.animation.axis || 'y';
                 const amp = obj.animation.amplitude || 20;
                 if ((obj.shapeType === 'spring' || obj.shapeType === 'helix') && springState.current.activeIdx === objIdx) {
                     // Disable auto oscillation while dragging
                 } else {
                     animPos[axis] = Math.sin(t * speed) * amp;
                 }
             } else if (obj.animation.type === 'compress') {
                 const axis = obj.animation.axis || 'y';
                 const amp = obj.animation.amplitude || 0.3;
                 animScale[axis] = 1 + Math.sin(t * speed) * amp;
             }
         }

         const explodeFactor = isExploded ? 1.8 : 1.0;
         const currentPos = {
             x: (obj.position.x + animPos.x) * explodeFactor,
             y: (obj.position.y + animPos.y) * explodeFactor,
             z: (obj.position.z + animPos.z) * explodeFactor
         };

         // --- Transform Points ---
         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

         const worldPoints = obj.basePoints.map(p => {
             let tx = p.x * obj.scale.x * animScale.x;
             let ty = p.y * obj.scale.y * animScale.y;
             let tz = p.z * obj.scale.z * animScale.z;

             const localRotated = rotatePoint({x: tx, y: ty, z: tz}, {
                 x: obj.rotation.x + animRot.x,
                 y: obj.rotation.y + animRot.y,
                 z: obj.rotation.z + animRot.z
             });

             return {
                 x: localRotated.x + currentPos.x,
                 y: localRotated.y + currentPos.y,
                 z: localRotated.z + currentPos.z
             };
         });

         // --- Calculate Screen Position & Bounding Box ---
         const camCenter = rotatePoint(currentPos, rotationRef.current);
         const centerScale = perspective / (camCenter.z + 1000);
         const screenX = cx + camCenter.x * centerScale;
         const screenY = cy + camCenter.y * centerScale;
         
         // Compute BBox from projected points for accurate hit testing
         worldPoints.forEach(p => {
             const cam = rotatePoint(p, rotationRef.current);
             const scale = perspective / (cam.z + 1000);
             const sx = cx + cam.x * scale;
             const sy = cy + cam.y * scale;
             if (sx < minX) minX = sx;
             if (sx > maxX) maxX = sx;
             if (sy < minY) minY = sy;
             if (sy > maxY) maxY = sy;
         });
         
         objectScreenPositions.current.push({
             idx: objIdx,
             x: screenX,
             y: screenY,
             r: 40 * centerScale,
             type: obj.shapeType || 'unknown',
             bbox: { minX, minY, maxX, maxY }
         });

         if (isHighlighted) {
             highlightsToRender.push({ minX, minY, maxX, maxY, color: obj.color });
         }

         if (obj.label) {
             labelsToRender.push({
                 x: screenX,
                 y: screenY,
                 text: obj.label,
                 highlighted: isHighlighted
             });
         }

         // --- SHADOW PASS ---
         const shadowY = 250; 
         const shadowPoints = worldPoints.map(p => {
            const dy = shadowY - p.y;
            const x = p.x + dy * 0.4; 
            const z = p.z + dy * 0.2; 
            const cam = rotatePoint({x, y: shadowY, z}, rotationRef.current);
            const scale = perspective / (cam.z + 1000);
            return { x: cx + cam.x * scale, y: cy + cam.y * scale, z: cam.z };
         });

         if (obj.faces.length > 0) {
             renderList.push({
               zIndex: -20000, 
               draw: () => {
                 ctx.fillStyle = 'rgba(14,165,233,0.05)'; 
                 ctx.strokeStyle = 'rgba(14,165,233,0.1)'; 
                 ctx.lineWidth = 1;
                 obj.faces.forEach(faceIndices => {
                    ctx.beginPath();
                    faceIndices.forEach((idx, i) => {
                       const p = shadowPoints[idx];
                       if (i===0) ctx.moveTo(p.x, p.y);
                       else ctx.lineTo(p.x, p.y);
                    });
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                 });
               }
             });
         }

         // --- OBJECT PASS ---
         const camPoints = worldPoints.map(p => {
             const cam = rotatePoint(p, rotationRef.current);
             const z = cam.z;
             const scale = perspective / (z + 1000);
             return {
                 x: cx + cam.x * scale,
                 y: cy + cam.y * scale,
                 z: z, 
                 sx: cx + cam.x * scale, 
                 sy: cy + cam.y * scale 
             };
         });

         if (obj.faces.length > 0) {
            obj.faces.forEach(faceIndices => {
               const p0 = worldPoints[faceIndices[0]];
               const p1 = worldPoints[faceIndices[1]];
               const p2 = worldPoints[faceIndices[2]];

               const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
               const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
               
               const nx = v1.y * v2.z - v1.z * v2.y;
               const ny = v1.z * v2.x - v1.x * v2.z;
               const nz = v1.x * v2.y - v1.y * v2.x;
               const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
               
               const camN = rotatePoint({x: nx, y: ny, z: nz}, rotationRef.current);
               
               if (camN.z < 0) { 
                  const dot = (nx * lightDir.x + ny * lightDir.y + nz * lightDir.z) / len;
                  const diffuse = Math.abs(dot); 
                  const camNLen = Math.sqrt(camN.x*camN.x + camN.y*camN.y + camN.z*camN.z);
                  const normalizedCamNz = Math.abs(camN.z / camNLen);
                  const fresnel = Math.pow(1 - normalizedCamNz, 3); 
                  
                  // HIGHLIGHT BOOST: If hovered/selected, boost lighting and opacity
                  const highlightBoost = isHighlighted ? 1.3 : 1.0;
                  const lighting = (0.2 + (diffuse * 0.5) + (fresnel * 0.8)) * highlightBoost;
                  
                  let avgZ = 0;
                  faceIndices.forEach(idx => avgZ += camPoints[idx].z);
                  avgZ /= faceIndices.length;

                  renderList.push({
                     zIndex: avgZ,
                     draw: () => {
                        ctx.fillStyle = obj.color;
                        ctx.globalAlpha = Math.min(1, (obj.opacity || 0.8) * lighting);
                        ctx.beginPath();
                        faceIndices.forEach((idx, i) => {
                           if (i===0) ctx.moveTo(camPoints[idx].sx, camPoints[idx].sy);
                           else ctx.lineTo(camPoints[idx].sx, camPoints[idx].sy);
                        });
                        ctx.closePath();
                        ctx.fill();
                        
                        if (fresnel > 0.4 || isHighlighted) {
                            ctx.globalAlpha = (fresnel * (obj.opacity || 1)) + (isHighlighted ? 0.3 : 0);
                            ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.4)';
                            ctx.lineWidth = isHighlighted ? 1.5 : 1;
                            ctx.stroke();
                        }
                     }
                  });
               }
            });
         } 
         
         renderList.push({
            zIndex: camPoints.reduce((acc, p) => acc + p.z, 0) / camPoints.length + 10, 
            draw: () => {
                ctx.strokeStyle = isHighlighted ? '#fff' : obj.color;
                ctx.globalAlpha = ((obj.opacity || 1) * 0.3) + (isHighlighted ? 0.3 : 0);
                ctx.lineWidth = isHighlighted ? 2 : 1;
                ctx.beginPath();
                obj.edges.forEach(([i, j]) => {
                    const p1 = camPoints[i];
                    const p2 = camPoints[j];
                    ctx.moveTo(p1.sx, p1.sy);
                    ctx.lineTo(p2.sx, p2.sy);
                });
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
         });
      });

      // 2. Process Particles
      if (particles.current.length > 0 && !isPaused) {
          particles.current.forEach(p => {
              p.y += p.vy; p.x += p.vx; p.z += p.vz;
              if (p.y > 60) {
                  p.y = -60; p.x = (Math.random()-0.5)*40; p.z = (Math.random()-0.5)*40;
              }
              const cam = rotatePoint(p, rotationRef.current);
              const scale = perspective / (cam.z + 1000);
              const sx = cx + cam.x * scale;
              const sy = cy + cam.y * scale;

              renderList.push({
                  zIndex: cam.z,
                  draw: () => {
                      const r = Math.max(0.5, 2 * scale);
                      ctx.fillStyle = '#60a5fa';
                      ctx.beginPath();
                      ctx.arc(sx, sy, r, 0, Math.PI * 2);
                      ctx.fill();
                  }
              });
          });
      }

      // 3. Draw Grid/Floor
      renderList.push({
        zIndex: -30000,
        draw: () => {
            const gridSize = 300;
            const steps = 8; // Optimized from 12
            const y = 250;
            ctx.beginPath();
            ctx.strokeStyle = '#0ea5e9'; 
            ctx.globalAlpha = 0.15;
            ctx.lineWidth = 1;
            for(let i=-steps; i<=steps; i++) {
                const pos = i * (gridSize/steps);
                const p1 = rotatePoint({x: -gridSize, y, z: pos}, rotationRef.current);
                const p2 = rotatePoint({x: gridSize, y, z: pos}, rotationRef.current);
                const s1 = perspective / (p1.z+1000);
                const s2 = perspective / (p2.z+1000);
                ctx.moveTo(cx + p1.x*s1, cy + p1.y*s1);
                ctx.lineTo(cx + p2.x*s2, cy + p2.y*s2);
                const p3 = rotatePoint({x: pos, y, z: -gridSize}, rotationRef.current);
                const p4 = rotatePoint({x: pos, y, z: gridSize}, rotationRef.current);
                const s3 = perspective / (p3.z+1000);
                const s4 = perspective / (p4.z+1000);
                ctx.moveTo(cx + p3.x*s3, cy + p3.y*s3);
                ctx.lineTo(cx + p4.x*s4, cy + p4.y*s4);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
      });

      // 4. Sort & Execute
      renderList.sort((a, b) => b.zIndex - a.zIndex);
      renderList.forEach(item => item.draw());

      // 5. Draw Target Highlights (Overlay)
      highlightsToRender.forEach(h => {
          const padding = 10;
          const minX = h.minX - padding;
          const minY = h.minY - padding;
          const maxX = h.maxX + padding;
          const maxY = h.maxY + padding;
          const w = maxX - minX;
          const h_box = maxY - minY;

          ctx.strokeStyle = h.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = h.color;
          ctx.shadowBlur = 10;
          
          // Draw Corners
          const cornerLen = 10;
          ctx.beginPath();
          // Top Left
          ctx.moveTo(minX, minY + cornerLen);
          ctx.lineTo(minX, minY);
          ctx.lineTo(minX + cornerLen, minY);
          // Top Right
          ctx.moveTo(maxX - cornerLen, minY);
          ctx.lineTo(maxX, minY);
          ctx.lineTo(maxX, minY + cornerLen);
          // Bottom Right
          ctx.moveTo(maxX, maxY - cornerLen);
          ctx.lineTo(maxX, maxY);
          ctx.lineTo(maxX - cornerLen, maxY);
          // Bottom Left
          ctx.moveTo(minX + cornerLen, maxY);
          ctx.lineTo(minX, maxY);
          ctx.lineTo(minX, maxY - cornerLen);
          ctx.stroke();
          
          ctx.shadowBlur = 0;
      });

      // 6. Draw Labels (Overlay)
      if (labelsToRender.length > 0) {
          ctx.font = '10px "Rajdhani"';
          labelsToRender.forEach(l => {
             const labelX = l.x + 30;
             const labelY = l.y - 30;
             
             ctx.beginPath();
             ctx.moveTo(l.x, l.y);
             ctx.lineTo(labelX, labelY);
             ctx.lineTo(labelX + 10, labelY);
             ctx.strokeStyle = l.highlighted ? '#ffffff' : '#38bdf8';
             ctx.lineWidth = l.highlighted ? 2 : 1;
             ctx.stroke();

             const metrics = ctx.measureText(l.text);
             const padding = 4;
             const boxW = metrics.width + padding * 2;
             const boxH = 14;
             
             // Highlighting Logic
             if (l.highlighted) {
                 ctx.fillStyle = 'rgba(56, 189, 248, 0.9)'; // Bright Blue
                 ctx.strokeStyle = '#ffffff';
             } else {
                 ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // Dark Slate
                 ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
             }

             ctx.fillRect(labelX + 10, labelY - boxH/2, boxW, boxH);
             ctx.strokeRect(labelX + 10, labelY - boxH/2, boxW, boxH);

             ctx.fillStyle = l.highlighted ? '#0f172a' : '#e0f2fe';
             ctx.font = l.highlighted ? 'bold 10px "Rajdhani"' : '10px "Rajdhani"';
             ctx.fillText(l.text, labelX + 10 + padding, labelY + 3);
          });
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [data, isExploded, isPaused]);

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full group cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
    >
        <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className="w-full h-full object-contain pointer-events-none z-10 relative"
        />
        
        {/* HUD Overlay with Export Function */}
        <HologramHUD onExport={handleExport} />

        {/* Hologram Controls HUD */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-slate-900/80 border border-sky-900/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-30 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
           
           <button 
             onClick={(e) => { e.stopPropagation(); undo(); }}
             className="p-2 text-slate-400 hover:text-white hover:bg-sky-500/20 rounded-full transition-colors"
             title="Undo Interaction"
           >
             <RotateCcw size={20} className="scale-x-[-1]" />
           </button>

           <button 
             onClick={(e) => { e.stopPropagation(); redo(); }}
             className="p-2 text-slate-400 hover:text-white hover:bg-sky-500/20 rounded-full transition-colors"
             title="Redo Interaction"
           >
             <RotateCcw size={20} />
           </button>

           <div className="w-px h-6 bg-slate-700"></div>

           <button 
             onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
             className="p-2 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-full transition-colors"
             title={isPaused ? "Resume Simulation" : "Pause Simulation"}
           >
             {isPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
           </button>

           <div className="w-px h-6 bg-slate-700"></div>

           <button 
             onClick={(e) => { e.stopPropagation(); setIsExploded(!isExploded); }}
             className={`p-2 rounded-full transition-colors flex gap-2 items-center ${isExploded ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-sky-500/20'}`}
             title="Exploded View (Internal Inspection)"
           >
             <Layers size={20} />
             {isExploded && <span className="text-[10px] font-mono pr-1">EXPAND</span>}
           </button>

           <div className="w-px h-6 bg-slate-700"></div>
           
           <button 
             onClick={(e) => { e.stopPropagation(); resetView(); }}
             className="p-2 text-slate-400 hover:text-white hover:bg-sky-500/20 rounded-full transition-colors"
             title="Reset Camera"
           >
             <Maximize size={20} />
           </button>

        </div>

        {/* Zoom Hints */}
        <div className="absolute right-4 bottom-1/2 translate-y-1/2 flex flex-col gap-1 p-1 bg-slate-900/50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 border border-slate-700">
           <ZoomIn size={14} className="text-sky-500" />
           <div className="w-1 h-12 bg-slate-800 rounded-full mx-auto relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 w-full bg-sky-500 rounded-full transition-all duration-100" 
                style={{ height: `${(zoomRef.current / 3.5) * 100}%` }}
              ></div>
           </div>
           <ZoomOut size={14} className="text-sky-500" />
        </div>
    </div>
  );
};


const ProjectionDisplay: React.FC<ProjectionDisplayProps> = ({ projection }) => {
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (projection) {
      setKey(prev => prev + 1);
    }
  }, [projection]);

  if (!projection) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-slate-900/30 rounded-2xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 w-full h-[10%] bg-sky-500/5 blur-xl animate-[scan_4s_linear_infinite] pointer-events-none"></div>
        <div className="flex flex-col items-center z-10 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500 blur-xl opacity-20 animate-pulse"></div>
            <Monitor size={64} className="text-slate-600 relative z-10" />
            <div className="absolute -inset-4 border border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
          </div>
          <div className="text-center">
             <h3 className="font-tech text-xl text-slate-500 tracking-[0.2em] mb-2">HOLO-EMITTER STANDBY</h3>
             <p className="text-xs text-slate-600 font-mono">WAITING FOR VISUAL DATA STREAM</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (projection.type) {
      case ProjectionType.CHART_BAR:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projection.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#1e293b', opacity: 0.4}}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', color: '#f1f5f9', boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="value" fill="url(#barGradient)" name="Primary Metric" radius={[2, 2, 0, 0]} animationDuration={1500} />
              {projection.data[0]?.value2 && <Bar dataKey="value2" fill="#6366f1" name="Comparison" radius={[2, 2, 0, 0]} animationDuration={1500} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case ProjectionType.CHART_LINE:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', color: '#f1f5f9' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#38bdf8' }} animationDuration={2000} />
              {projection.data[0]?.value2 && <Line type="monotone" dataKey="value2" stroke="#6366f1" strokeWidth={3} dot={false} strokeDasharray="5 5" />}
            </LineChart>
          </ResponsiveContainer>
        );

      case ProjectionType.LIST:
        return (
          <ul className="space-y-3 w-full max-w-3xl mx-auto">
            {(projection.data as string[]).map((item, idx) => (
              <li key={idx} 
                  className="flex items-start gap-4 bg-slate-800/40 p-4 rounded-r-lg border-l-4 border-sky-500 hover:bg-slate-800/60 transition-all group animate-[slideIn_0.3s_ease-out_forwards]"
                  style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded bg-slate-900 text-sky-400 flex items-center justify-center text-xs font-bold font-tech border border-slate-700 group-hover:border-sky-500 transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-slate-200 group-hover:text-white transition-colors">{item}</span>
              </li>
            ))}
          </ul>
        );

      case ProjectionType.STAT_CARD:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
             {(projection.data as {label: string, value: string, change?: string}[]).map((stat, idx) => (
               <div key={idx} className="relative bg-slate-900/40 p-6 overflow-hidden group border border-slate-800 hover:border-sky-500/50 transition-colors">
                 <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-600 group-hover:border-sky-500 transition-colors"></div>
                 <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-600 group-hover:border-sky-500 transition-colors"></div>
                 <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-600 group-hover:border-sky-500 transition-colors"></div>
                 <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-600 group-hover:border-sky-500 transition-colors"></div>
                 
                 <h3 className="text-slate-400 text-xs font-bold font-tech uppercase tracking-widest mb-3 flex items-center gap-2">
                   <Zap size={12} className="text-sky-500" /> {stat.label}
                 </h3>
                 <div className="text-4xl font-tech text-white mb-2">{stat.value}</div>
                 {stat.change && (
                   <div className={`text-sm font-medium px-2 py-1 inline-block rounded ${
                     stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                   }`}>
                     {stat.change}
                   </div>
                 )}
               </div>
             ))}
          </div>
        );

      case ProjectionType.IMAGE:
        const imgData = projection.data as { url: string, alt?: string };
        return (
          <div className="relative w-full h-full flex items-center justify-center p-4">
             <div className="relative max-w-full max-h-full border-2 border-slate-700 bg-slate-900/50 p-1 group">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-sky-500"></div>
                <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-sky-500"></div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-sky-500"></div>
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-sky-500"></div>
                
                <img 
                  src={imgData.url} 
                  alt={imgData.alt || "Projected Image"} 
                  className="max-h-[60vh] object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/0f172a/38bdf8?text=IMAGE+SIGNAL+LOST';
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-30"></div>
             </div>
          </div>
        );

      case ProjectionType.TECHNICAL_SVG:
        const svgContent = projection.data as string;
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-2 lg:p-6 bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden group">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.07)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
             <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.1)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none"></div>

             <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sky-500 text-[10px] font-tech tracking-widest uppercase">
                   <PenTool size={12} />
                   <span>SCHEMATIC_VIEWER_V2.1</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                   SCALE: 1:1.0 | GRID: ON | LAYER: 01
                </div>
             </div>
             
             <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/90 p-1.5 rounded border border-slate-700 backdrop-blur-sm">
                <button className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"><ZoomIn size={16} /></button>
                <button className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"><ZoomOut size={16} /></button>
                <button className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"><Move size={16} /></button>
             </div>

             <div 
               className="relative z-10 w-full h-full max-w-4xl max-h-[70vh] flex items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:drop-shadow-[0_0_10px_rgba(56,189,248,0.3)] transition-all duration-500 ease-out scale-95 group-hover:scale-100"
               dangerouslySetInnerHTML={{ __html: svgContent }} 
             />
             
             <div className="absolute bottom-8 left-8 h-12 w-12 border-l border-b border-sky-500/30"></div>
             <div className="absolute top-8 right-8 h-12 w-12 border-r border-t border-sky-500/30"></div>
          </div>
        );

      case ProjectionType.HOLOGRAM_3D:
        const hasAnimation = (projection.data?.elements || []).some((e: any) => e.animation);
        return (
           <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-sky-900/10 radial-gradient-to-t from-sky-500/5 to-transparent pointer-events-none"></div>
              
              <div className="w-full h-full max-w-4xl aspect-video relative z-10 hover:scale-[1.02] transition-transform duration-500 ease-out">
                 <HologramCanvas data={projection.data} />
              </div>
           </div>
        );

      default:
        return (
          <div className="p-6 bg-slate-900/80 rounded border border-slate-700 w-full font-mono text-xs text-sky-300">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(projection.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (projection.type) {
      case ProjectionType.CHART_BAR: return <BarChart2 className="text-sky-400" />;
      case ProjectionType.CHART_LINE: return <Activity className="text-sky-400" />;
      case ProjectionType.LIST: return <List className="text-sky-400" />;
      case ProjectionType.IMAGE: return <ImageIcon className="text-sky-400" />;
      case ProjectionType.TECHNICAL_SVG: return <Settings className="text-sky-400 animate-[spin_5s_linear_infinite]" />;
      case ProjectionType.HOLOGRAM_3D: return <Box className="text-sky-400 animate-pulse" />;
      default: return <Database className="text-sky-400" />;
    }
  };

  return (
    <div key={key} className="flex flex-col h-full bg-black/40 rounded-t-2xl border-x border-t border-slate-800 overflow-hidden relative shadow-[0_0_50px_-12px_rgba(14,165,233,0.1)] animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500 blur opacity-20"></div>
            <div className="relative p-2 bg-slate-900 rounded border border-slate-700">
              {getIcon()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-tech text-xl text-white tracking-widest uppercase animate-[slideRight_0.5s_ease-out]">{projection.title}</h2>
              <span className="px-1.5 py-0.5 rounded-[1px] bg-sky-500/20 border border-sky-500/40 text-[10px] text-sky-400 font-tech">SECURE</span>
            </div>
            {projection.description && <p className="text-xs text-slate-400 font-mono mt-0.5">{projection.description}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col items-end">
             <div className="flex gap-1">
               {[1,2,3].map(i => <div key={i} className={`w-1 h-3 bg-sky-500/30 ${i===3 ? 'animate-pulse bg-sky-500' : ''}`}></div>)}
             </div>
             <span className="text-[10px] text-sky-500 font-tech">LIVE FEED</span>
           </div>
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-8 overflow-auto flex items-center justify-center relative bg-[linear-gradient(rgba(15,23,42,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.5)_1px,transparent_1px)] bg-[size:40px_40px]">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-sky-400/20 shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-[scan_3s_linear_infinite_reverse] pointer-events-none z-0"></div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {renderContent()}
        </div>
      </div>

      <div className="h-8 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between px-4 text-[10px] font-tech text-slate-500">
        <div className="flex gap-4">
          <span>COORDS: 45.92.11</span>
          <span>MODE: {projection.type === ProjectionType.TECHNICAL_SVG ? 'SCHEMATIC_RENDER' : projection.type === ProjectionType.HOLOGRAM_3D ? '3D_SIMULATION' : 'VISUALIZATION'}</span>
        </div>
        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-sky-500/50 w-2/3 animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>

      <svg className="absolute top-0 left-0 w-16 h-16 pointer-events-none text-sky-500/50" viewBox="0 0 100 100">
        <path d="M 2 2 L 30 2 L 2 30 Z" fill="currentColor" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none text-sky-500/50" viewBox="0 0 100 100">
        <path d="M 98 98 L 70 98 L 98 70 Z" fill="currentColor" />
      </svg>
    </div>
  );
};

export default ProjectionDisplay;
