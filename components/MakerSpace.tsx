
import React, { useRef, useEffect, useState } from 'react';
import { Play, Square, Save, Trash, RotateCcw, Box, Cpu, Zap, Activity, Terminal, Cable, MousePointer2, Grid3X3, Battery, Monitor, type LucideIcon } from 'lucide-react';
import { MakerComponent, Wire, PinDefinition, ComponentType } from '../types';

// --- 3D Helper ---
const rotatePoint = (p: {x:number, y:number, z:number}, rot: {x:number, y:number, z:number}) => {
  let { x, y, z } = p;
  // Rotate Y (Yaw)
  if (rot.y !== 0) {
    const cosY = Math.cos(rot.y), sinY = Math.sin(rot.y);
    const x1 = x*cosY + z*sinY, z2 = z*cosY - x*sinY; x=x1; z=z2;
  }
  // Rotate X (Pitch) - simplified for top-down view tilt
  if (rot.x !== 0) {
    const cosX = Math.cos(rot.x), sinX = Math.sin(rot.x);
    const y1 = y*cosX - z*sinX, z1 = z*cosX + y*sinX; y=y1; z=z1;
  }
  return { x, y, z };
};

// --- COMPONENT GEOMETRY & PIN LAYOUTS ---
// These define the physical look and connection points relative to component center (0,0,0)

const ARDUINO_PINS: PinDefinition[] = [
    // POWER HEADER
    { id: 'IOREF', x: -18, y: 5, z: 42 }, { id: 'RESET', x: -10, y: 5, z: 42 },
    { id: '3.3V', x: -2, y: 5, z: 42 },   { id: '5V', x: 6, y: 5, z: 42 },
    { id: 'GND_1', x: 14, y: 5, z: 42 },  { id: 'GND_2', x: 22, y: 5, z: 42 },
    { id: 'VIN', x: 30, y: 5, z: 42 },
    // ANALOG HEADER
    { id: 'A0', x: 50, y: 5, z: 42 }, { id: 'A1', x: 58, y: 5, z: 42 },
    { id: 'A2', x: 66, y: 5, z: 42 }, { id: 'A3', x: 74, y: 5, z: 42 },
    { id: 'A4', x: 82, y: 5, z: 42 }, { id: 'A5', x: 90, y: 5, z: 42 },
    // DIGITAL HEADER (HIGH)
    { id: 'SCL', x: -24, y: 5, z: -42 }, { id: 'SDA', x: -16, y: 5, z: -42 },
    { id: 'AREF', x: -8, y: 5, z: -42 }, { id: 'GND_3', x: 0, y: 5, z: -42 },
    { id: 'D13', x: 8, y: 5, z: -42 },   { id: 'D12', x: 16, y: 5, z: -42 },
    { id: 'D11', x: 24, y: 5, z: -42 },  { id: 'D10', x: 32, y: 5, z: -42 },
    { id: 'D9', x: 40, y: 5, z: -42 },   { id: 'D8', x: 48, y: 5, z: -42 },
    // DIGITAL HEADER (LOW)
    { id: 'D7', x: 62, y: 5, z: -42 },   { id: 'D6', x: 70, y: 5, z: -42 },
    { id: 'D5', x: 78, y: 5, z: -42 },   { id: 'D4', x: 86, y: 5, z: -42 },
    { id: 'D3', x: 94, y: 5, z: -42 },   { id: 'D2', x: 102, y: 5, z: -42 },
    { id: 'D1', x: 110, y: 5, z: -42 },  { id: 'D0', x: 118, y: 5, z: -42 },
];

const PIN_LAYOUTS: Record<ComponentType, PinDefinition[]> = {
  arduino_uno: ARDUINO_PINS,
  breadboard_small: [
    // Simplified breadboard power rails for demo
    { id: 'pos_1', x: -130, y: 5, z: -40 }, { id: 'neg_1', x: -130, y: 5, z: -32 },
    { id: 'pos_2', x: 130, y: 5, z: -40 },  { id: 'neg_2', x: 130, y: 5, z: -32 },
    { id: 'pos_3', x: -130, y: 5, z: 40 },  { id: 'neg_3', x: -130, y: 5, z: 32 },
    { id: 'pos_4', x: 130, y: 5, z: 40 },   { id: 'neg_4', x: 130, y: 5, z: 32 },
    // Some grid pins
    { id: 'a1', x: -120, y: 5, z: -15 }, { id: 'a30', x: 120, y: 5, z: -15 },
    { id: 'j1', x: -120, y: 5, z: 15 },  { id: 'j30', x: 120, y: 5, z: 15 },
  ],
  led: [
    { id: 'anode', x: -4, y: -10, z: 0, label: 'Anode' },
    { id: 'cathode', x: 4, y: -10, z: 0, label: 'Cathode' }
  ],
  resistor: [
    { id: 't1', x: -15, y: 0, z: 0, label: 'Terminal 1' },
    { id: 't2', x: 15, y: 0, z: 0, label: 'Terminal 2' }
  ],
  push_button: [
    { id: '1a', x: -8, y: 5, z: -8 }, { id: '1b', x: -8, y: 5, z: 8 },
    { id: '2a', x: 8, y: 5, z: -8 },  { id: '2b', x: 8, y: 5, z: 8 }
  ],
  potentiometer: [
    { id: '1', x: -10, y: 5, z: 0, label: 'Terminal 1' },
    { id: 'w', x: 0, y: 5, z: 12, label: 'Wiper' },
    { id: '2', x: 10, y: 5, z: 0, label: 'Terminal 2' }
  ],
  servo: [
    { id: 'gnd', x: -8, y: 0, z: 15 }, { id: 'vcc', x: 0, y: 0, z: 15 }, { id: 'sig', x: 8, y: 0, z: 15 }
  ],
  motor_dc: [
    { id: 't1', x: -8, y: 0, z: 20 }, { id: 't2', x: 8, y: 0, z: 20 }
  ],
  ultrasonic: [
    { id: 'vcc', x: -15, y: -10, z: 5 }, { id: 'trig', x: -5, y: -10, z: 5 },
    { id: 'echo', x: 5, y: -10, z: 5 },  { id: 'gnd', x: 15, y: -10, z: 5 }
  ],
  lcd_16x2: [
    { id: 'vss', x: -60, y: 5, z: 25 }, { id: 'vdd', x: -52, y: 5, z: 25 }, { id: 'v0', x: -44, y: 5, z: 25 },
    { id: 'k', x: 60, y: 5, z: 25 },    { id: 'a', x: 52, y: 5, z: 25 }
  ],
  battery_9v: [
     { id: 'pos', x: -6, y: 15, z: -15 }, { id: 'neg', x: 6, y: 15, z: -15 }
  ]
};

const DEFAULT_ARDUINO_CODE = `// Arduino Simulator
// Controls: LED on Pin 13

void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);
  
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`;

// --- Component Library Definition ---
const LIBRARY = [
  { type: 'arduino_uno', label: 'Arduino Uno R3', icon: Cpu, color: '#00979C' },
  { type: 'breadboard_small', label: 'Breadboard Small', icon: Grid3X3, color: '#f8fafc' },
  { type: 'led', label: 'LED', icon: Zap, color: '#ef4444' },
  { type: 'resistor', label: 'Resistor', icon: Activity, color: '#d4d4d4' },
  { type: 'push_button', label: 'Push Button', icon: Square, color: '#334155' },
  { type: 'potentiometer', label: 'Potentiometer', icon: Activity, color: '#3b82f6' },
  { type: 'servo', label: 'Micro Servo', icon: Box, color: '#3b82f6' },
  { type: 'motor_dc', label: 'DC Motor', icon: Activity, color: '#eab308' },
  { type: 'battery_9v', label: '9V Battery', icon: Battery, color: '#0f172a' },
  { type: 'lcd_16x2', label: 'LCD 16x2', icon: Monitor, color: '#22c55e' },
  { type: 'ultrasonic', label: 'Ultrasonic Sensor', icon: Activity, color: '#64748b' }
] as const;

const MakerSpace: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Data State
  const [components, setComponents] = useState<MakerComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [code, setCode] = useState(DEFAULT_ARDUINO_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // UI State
  const [mode, setMode] = useState<'select' | 'wire'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{compId: string, pinId: string} | null>(null);
  const [drawingWireStart, setDrawingWireStart] = useState<{compId: string, pinId: string} | null>(null);
  const [wireColor, setWireColor] = useState('#22c55e');

  // Refs
  const camRef = useRef({ rotX: 0.8, rotY: 0, zoom: 1, panX: 0, panY: 0 });
  const mouseRef = useRef({ x: 0, y: 0, down: false, button: 0 });
  const dragRef = useRef<{ id: string, startX: number, startY: number, startPos: {x:number, y:number, z:number} } | null>(null);
  const hitRegionsRef = useRef<{ type: 'comp'|'pin', id: string, pinId?: string, x: number, y: number, r: number }[]>([]);
  const intervalRef = useRef<number | null>(null);

  // --- ACTIONS ---
  const addComponent = (type: ComponentType) => {
    const id = `${type}_${Date.now().toString().slice(-4)}`;
    const newComp: MakerComponent = {
      id,
      type,
      position: { x: (Math.random()-0.5)*100, y: 0, z: (Math.random()-0.5)*100 },
      rotation: { x: 0, y: 0, z: 0 },
      properties: {
        color: type === 'led' ? '#ef4444' : undefined,
        value: 0
      }
    };
    setComponents([...components, newComp]);
  };

  const removeSelected = () => {
    if (selectedId) {
      setComponents(components.filter(c => c.id !== selectedId));
      setWires(wires.filter(w => w.sourceId !== selectedId && w.targetId !== selectedId));
      setSelectedId(null);
    }
  };

  const clearAll = () => {
      setComponents([]);
      setWires([]);
      setSelectedId(null);
      setIsRunning(false);
  };

  // --- SIMULATION LOGIC ---
  const runSimulation = () => {
    if (isRunning) { stopSimulation(); return; }
    setIsRunning(true);
    setLogs(['> COMPILING SKETCH...', '> UPLOAD COMPLETE.', '> SIMULATION STARTED']);

    // Mock Execution Environment
    let ticks = 0;
    
    intervalRef.current = window.setInterval(() => {
        ticks++;
        
        // --- 1. Execute "Code" Logic (Simplified for Demo) ---
        // Parse basic Arduino commands from string
        const lines = code.split('\n');
        
        // Very basic parser to detect digitalWrite(13, HIGH/LOW)
        lines.forEach(line => {
            if (line.includes('digitalWrite')) {
                const match = line.match(/digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW)\s*\)/);
                if (match) {
                    const pin = `D${match[1]}`;
                    const state = match[2] === 'HIGH' ? 1 : 0;
                    
                    // Simple blink logic based on delay/ticks
                    const hasDelay = code.includes('delay');
                    const period = hasDelay ? 20 : 1; // Arbitrary tick period
                    const isOn = Math.floor(ticks / period) % 2 === 0;
                    
                    if (state === 1 && isOn) updatePinState(pin, 1);
                    else if (state === 0) updatePinState(pin, 0);
                    else updatePinState(pin, 0);
                }
            }
            if (line.includes('Serial.println') && ticks % 40 === 0) {
                 const match = line.match(/Serial\.println\s*\(\s*"(.*)"\s*\)/);
                 if (match) setLogs(prev => [...prev.slice(-4), `Serial: ${match[1]}`]);
            }
        });

        // --- 2. Propagate Signals through Wires ---
        // Find Arduino
        const arduino = components.find(c => c.type === 'arduino_uno');
        if (arduino) {
            // Find LED connected to D13 (Common Blink)
            // Just for visual demo: Any LED connected to any Active Arduino Pin gets power
            wires.forEach(wire => {
                if (wire.sourceId === arduino.id && wire.sourcePin === 'D13') {
                     // Check if target is LED
                     const target = components.find(c => c.id === wire.targetId);
                     if (target && target.type === 'led') {
                         // Blink it
                         const period = 20; 
                         const isOn = Math.floor(ticks / period) % 2 === 0;
                         setComponents(prev => prev.map(c => c.id === target.id ? { ...c, properties: { ...c.properties, value: isOn ? 1 : 0 } } : c));
                     }
                }
            });
        }
        
    }, 50);
  };

  const updatePinState = (pinId: string, value: number) => {
      // Internal logic state tracker could go here
  };

  const stopSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setComponents(prev => prev.map(c => ({...c, properties: {...c.properties, value: 0}}))); // Reset state
    setLogs(prev => [...prev, '> STOPPED']);
  };

  useEffect(() => () => { if(intervalRef.current) clearInterval(intervalRef.current); }, []);

  // --- INPUT HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    mouseRef.current.down = true;
    mouseRef.current.button = e.button;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;

    // Hit Test
    const hit = hitRegionsRef.current.find(h => {
        const dx = h.x - mx;
        const dy = h.y - my;
        return (dx*dx + dy*dy) < h.r * h.r;
    });

    if (mode === 'wire' && e.button === 0) {
        if (hit && hit.type === 'pin' && hit.pinId) {
            setDrawingWireStart({ compId: hit.id, pinId: hit.pinId });
        } else {
            setDrawingWireStart(null);
        }
    } else if (e.button === 0) {
        // Select Mode
        if (hit && hit.type === 'comp') {
            setSelectedId(hit.id);
            const comp = components.find(c => c.id === hit.id);
            if (comp) {
                dragRef.current = { id: hit.id, startX: e.clientX, startY: e.clientY, startPos: { ...comp.position } };
            }
        } else {
            setSelectedId(null);
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Check Hover
    const hit = hitRegionsRef.current.find(h => {
        const dx = h.x - mx;
        const dy = h.y - my;
        return (dx*dx + dy*dy) < h.r * h.r;
    });

    if (hit && hit.type === 'pin' && hit.pinId) {
        setHoveredPin({ compId: hit.id, pinId: hit.pinId });
        document.body.style.cursor = 'crosshair';
    } else if (hit && hit.type === 'comp' && mode === 'select') {
        setHoveredPin(null);
        document.body.style.cursor = 'move';
    } else {
        setHoveredPin(null);
        document.body.style.cursor = 'default';
    }

    if (mouseRef.current.down) {
        const dx = e.clientX - rect.left - mouseRef.current.x;
        const dy = e.clientY - rect.top - mouseRef.current.y;

        if (mode === 'select' && dragRef.current) {
             // Drag Component
             const rawDx = e.clientX - dragRef.current.startX;
             const rawDy = e.clientY - dragRef.current.startY;
             const zoomFactor = 1 / camRef.current.zoom;
             
             // Project movement based on camera rotation (Simplified top-down logic)
             setComponents(prev => prev.map(c => {
                 if (c.id === dragRef.current?.id) {
                     return {
                         ...c,
                         position: {
                             x: dragRef.current.startPos.x + rawDx * zoomFactor, 
                             y: c.position.y,
                             z: dragRef.current.startPos.z + rawDy * zoomFactor
                         }
                     };
                 }
                 return c;
             }));
        } else if (mouseRef.current.button === 2 || (mouseRef.current.button === 0 && !dragRef.current)) {
             // Pan Camera (Right click or drag background)
             camRef.current.panX += dx;
             camRef.current.panY += dy;
             mouseRef.current.x = mx;
             mouseRef.current.y = my;
        }
    } else {
        mouseRef.current.x = mx;
        mouseRef.current.y = my;
    }
  };

  const handleMouseUp = () => {
    if (mode === 'wire' && drawingWireStart && hoveredPin) {
        if (drawingWireStart.compId !== hoveredPin.compId || drawingWireStart.pinId !== hoveredPin.pinId) {
            const newWire: Wire = {
                id: `w_${Date.now()}`,
                sourceId: drawingWireStart.compId,
                sourcePin: drawingWireStart.pinId,
                targetId: hoveredPin.compId,
                targetPin: hoveredPin.pinId,
                color: wireColor
            };
            setWires([...wires, newWire]);
        }
    }
    mouseRef.current.down = false;
    dragRef.current = null;
    setDrawingWireStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      const delta = e.deltaY * -0.001;
      camRef.current.zoom = Math.min(Math.max(0.2, camRef.current.zoom + delta), 3);
  };

  // --- RENDERER ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
      const cx = canvas.width / 2 + camRef.current.panX;
      const cy = canvas.height / 2 + camRef.current.panY;
      const perspective = 1000 * camRef.current.zoom;

      // Clear
      ctx.fillStyle = '#f1f5f9'; // Tinkercad-ish light background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      hitRegionsRef.current = [];
      const pinScreenPos = new Map<string, {x:number, y:number}>();

      // Draw Grid
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSize = 500;
      const steps = 10;
      for (let i = -steps; i <= steps; i++) {
         const d = i * (gridSize/steps);
         const p1 = rotatePoint({x: -gridSize, y: 0, z: d}, camRef.current);
         const p2 = rotatePoint({x: gridSize, y: 0, z: d}, camRef.current);
         const s1 = perspective / (p1.z + 1000);
         const s2 = perspective / (p2.z + 1000);
         ctx.moveTo(cx + p1.x*s1, cy + p1.y*s1);
         ctx.lineTo(cx + p2.x*s2, cy + p2.y*s2);

         const p3 = rotatePoint({x: d, y: 0, z: -gridSize}, camRef.current);
         const p4 = rotatePoint({x: d, y: 0, z: gridSize}, camRef.current);
         const s3 = perspective / (p3.z + 1000);
         const s4 = perspective / (p4.z + 1000);
         ctx.moveTo(cx + p3.x*s3, cy + p3.y*s3);
         ctx.lineTo(cx + p4.x*s4, cy + p4.y*s4);
      }
      ctx.stroke();

      // Project Helper
      const project = (wx: number, wy: number, wz: number) => {
         const r = rotatePoint({x: wx, y: wy, z: wz}, camRef.current);
         const s = perspective / (r.z + 1000);
         return { x: cx + r.x * s, y: cy + r.y * s, scale: s };
      };

      // 1. Draw Components
      // Sort by Z for simple painter's algorithm
      const renderOrder = [...components].map(c => {
         const dist = rotatePoint(c.position, camRef.current).z;
         return { c, dist };
      }).sort((a, b) => a.dist - b.dist);

      renderOrder.forEach(({ c }) => {
          const { x, y, scale } = project(c.position.x, c.position.y, c.position.z);
          const isSelected = selectedId === c.id;

          // Hit Region for Component body
          hitRegionsRef.current.push({ type: 'comp', id: c.id, x, y, r: 40 * scale });

          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);

          // DRAW COMPONENT VISUALS
          if (c.type === 'arduino_uno') {
              // PCB Body
              ctx.fillStyle = '#00979C'; // Teal
              ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10;
              drawRoundedRect(ctx, -125, -60, 250, 120, 5); // Main Board
              ctx.fill(); ctx.shadowBlur = 0;
              
              // USB Port (Silver)
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(-135, -40, 20, 30);
              
              // Power Jack (Black)
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(-130, 20, 25, 30);

              // Headers (Black Strips)
              ctx.fillStyle = '#000';
              // Top Headers (Digital)
              ctx.fillRect(-30, -50, 160, 10);
              // Bottom Headers (Power/Analog)
              ctx.fillRect(-30, 40, 130, 10);

              // Chip (ATmega)
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(20, 10, 80, 20);
              ctx.fillStyle = '#e2e8f0'; // Text on chip
              ctx.font = '10px sans-serif';
              ctx.fillText('ATMEGA', 30, 24);

              // Label
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 14px sans-serif';
              ctx.fillText('UNO', 60, -20);
              ctx.font = '10px sans-serif';
              ctx.fillText('ON', -110, -10);

          } else if (c.type === 'breadboard_small') {
              // Body
              ctx.fillStyle = '#f8fafc';
              ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 10;
              drawRoundedRect(ctx, -140, -45, 280, 90, 4);
              ctx.fill(); ctx.shadowBlur = 0;
              
              // Center Ravine
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(-135, -2, 270, 4);

              // Power Rails lines
              ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; // Pos
              ctx.beginPath(); ctx.moveTo(-130, -38); ctx.lineTo(130, -38); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(-130, 38); ctx.lineTo(130, 38); ctx.stroke();
              
              ctx.strokeStyle = '#3b82f6'; // Neg
              ctx.beginPath(); ctx.moveTo(-130, -34); ctx.lineTo(130, -34); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(-130, 34); ctx.lineTo(130, 34); ctx.stroke();

          } else if (c.type === 'led') {
              // Legs
              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, 15); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4, 15); ctx.stroke();
              
              // Bulb
              const isOn = (c.properties.value || 0) > 0;
              ctx.fillStyle = c.properties.color || 'red';
              ctx.globalAlpha = isOn ? 1 : 0.4;
              if (isOn) { ctx.shadowColor = c.properties.color || 'red'; ctx.shadowBlur = 20; }
              ctx.beginPath();
              ctx.arc(0, -5, 10, Math.PI, 0); // Top dome
              ctx.lineTo(10, 5);
              ctx.lineTo(-10, 5);
              ctx.fill();
              ctx.globalAlpha = 1; ctx.shadowBlur = 0;

          } else if (c.type === 'resistor') {
              // Wire
              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
              
              // Body
              ctx.fillStyle = '#fecaca'; // Beige/Tan
              drawRoundedRect(ctx, -15, -6, 30, 12, 5);
              ctx.fill();
              // Bands (Mock)
              ctx.fillStyle = '#a16207'; ctx.fillRect(-8, -6, 3, 12);
              ctx.fillStyle = '#000'; ctx.fillRect(-2, -6, 3, 12);
              ctx.fillStyle = '#ef4444'; ctx.fillRect(4, -6, 3, 12);

          } else if (c.type === 'potentiometer') {
              // Body
              ctx.fillStyle = '#334155';
              ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
              // Knob
              ctx.fillStyle = '#94a3b8';
              ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, 6); ctx.stroke();
              // Legs (Mock)
              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-10, 5); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10, 5); ctx.stroke();
              
          } else if (c.type === 'battery_9v') {
              ctx.fillStyle = '#1e293b';
              drawRoundedRect(ctx, -25, -40, 50, 80, 4);
              ctx.fill();
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 12px sans-serif';
              ctx.fillText('9V', -10, 0);
              // Terminals
              ctx.fillStyle = '#cbd5e1';
              ctx.beginPath(); ctx.arc(-10, -40, 6, 0, Math.PI*2); ctx.fill(); // Hex
              ctx.beginPath(); ctx.arc(10, -40, 6, 0, Math.PI*2); ctx.fill(); // Circle

          } else {
              // Generic Fallback
              ctx.fillStyle = '#64748b';
              ctx.fillRect(-20, -20, 40, 40);
              ctx.fillStyle = '#fff';
              ctx.fillText(c.type, -15, 0);
          }

          // Selection Outline
          if (isSelected) {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.strokeRect(-50, -50, 100, 100); // Rough box
          }

          ctx.restore();

          // DRAW PINS (Overlay on top of component space)
          const pins = PIN_LAYOUTS[c.type] || [];
          pins.forEach(pin => {
              // Calculate World Pos of Pin
              const wx = c.position.x + pin.x;
              const wy = c.position.y + pin.y; // Y is up/down in 3D
              const wz = c.position.z + pin.z;
              
              const p = project(wx, wy, wz);
              pinScreenPos.set(`${c.id}_${pin.id}`, { x: p.x, y: p.y });
              
              hitRegionsRef.current.push({ type: 'pin', id: c.id, pinId: pin.id, x: p.x, y: p.y, r: 6 });

              const isHovered = hoveredPin?.compId === c.id && hoveredPin?.pinId === pin.id;
              const isStart = drawingWireStart?.compId === c.id && drawingWireStart?.pinId === pin.id;

              ctx.beginPath();
              ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2);
              ctx.fillStyle = isHovered || isStart ? '#ef4444' : 'rgba(0,0,0,0.3)';
              ctx.fill();
              
              // Pin Label Tooltip
              if (isHovered) {
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(p.x + 10, p.y - 20, 40, 16);
                  ctx.fillStyle = '#fff';
                  ctx.font = '10px monospace';
                  ctx.fillText(pin.id, p.x + 14, p.y - 9);
              }
          });
      });

      // 2. Draw Wires
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      wires.forEach(wire => {
          const start = pinScreenPos.get(`${wire.sourceId}_${wire.sourcePin}`);
          const end = pinScreenPos.get(`${wire.targetId}_${wire.targetPin}`);
          
          if (start && end) {
             ctx.lineWidth = 4;
             ctx.strokeStyle = `rgba(0,0,0,0.3)`; // Shadow
             ctx.beginPath(); ctx.moveTo(start.x+2, start.y+2); ctx.lineTo(end.x+2, end.y+2); ctx.stroke();

             ctx.lineWidth = 3;
             ctx.strokeStyle = wire.color;
             ctx.beginPath();
             ctx.moveTo(start.x, start.y);
             // Curve? For now straight for performance/clarity in 2D proj
             const cp1x = start.x;
             const cp1y = start.y - 20; // Arc up?
             // ctx.bezierCurveTo... let's stick to straight for reliability in top-down
             ctx.lineTo(end.x, end.y);
             ctx.stroke();
          }
      });

      // Active Wire
      if (mode === 'wire' && drawingWireStart) {
          const start = pinScreenPos.get(`${drawingWireStart.compId}_${drawingWireStart.pinId}`);
          if (start) {
              ctx.strokeStyle = wireColor;
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
              ctx.stroke();
              ctx.setLineDash([]);
          }
      }
      
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [components, wires, hoveredPin, selectedId, mode, drawingWireStart, wireColor]);

  // Helper
  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  return (
    <div className="flex h-full w-full bg-[#f1f5f9] text-slate-800 overflow-hidden font-sans select-none">
       {/* Sidebar Library */}
       <div className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-sm">
          <div className="p-4 border-b border-slate-100 font-bold text-slate-700 tracking-wide hidden lg:block">
              Components
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {LIBRARY.map((item) => (
               <button 
                 key={item.type}
                 onClick={() => addComponent(item.type as ComponentType)} 
                 className="w-full text-left p-2 flex flex-col lg:flex-row items-center gap-3 hover:bg-slate-50 rounded border border-transparent hover:border-sky-200 transition-all group"
               >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-slate-100 group-hover:bg-white border border-slate-200`} style={{color: item.color}}>
                     <item.icon size={20} />
                  </div>
                  <div className="text-xs font-semibold text-slate-600 hidden lg:block">{item.label}</div>
               </button>
             ))}
          </div>
       </div>

       {/* Main Workspace */}
       <div className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Top Bar */}
          <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shadow-sm">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Box className="text-sky-500" size={20} /> <span className="hidden sm:inline">Circuit Design 1</span>
                 </div>
                 
                 {/* Tools */}
                 <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    <button 
                        onClick={() => setMode('select')}
                        className={`p-2 rounded-md transition-all ${mode === 'select' ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Select (V)"
                    >
                        <MousePointer2 size={18} />
                    </button>
                    <button 
                        onClick={() => setMode('wire')}
                        className={`p-2 rounded-md transition-all ${mode === 'wire' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Wire (W)"
                    >
                        <Cable size={18} />
                    </button>
                 </div>

                 {mode === 'wire' && (
                     <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        {['#ef4444', '#22c55e', '#3b82f6', '#000000'].map(c => (
                            <button 
                              key={c} 
                              onClick={() => setWireColor(c)}
                              className={`w-6 h-6 rounded border-2 ${wireColor === c ? 'border-slate-400' : 'border-transparent'}`}
                              style={{backgroundColor: c}}
                            />
                        ))}
                     </div>
                 )}
             </div>
             
             <div className="flex items-center gap-2">
                 <button 
                    onClick={runSimulation}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        isRunning 
                        ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200'
                    }`}
                  >
                      {isRunning ? <><Square size={16} fill="currentColor" /> Stop Simulation</> : <><Play size={16} fill="currentColor" /> Start Simulation</>}
                  </button>
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                <button onClick={removeSelected} className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-lg transition-colors" title="Delete"><Trash size={18} /></button>
             </div>
          </div>

          {/* 3D Canvas */}
          <div 
             className={`flex-1 relative bg-slate-50 overflow-hidden ${mode === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onWheel={handleWheel}
             onContextMenu={(e) => e.preventDefault()}
          >
             <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Code Editor Panel */}
          <div className="h-48 border-t border-slate-200 bg-white flex flex-col shrink-0 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Terminal size={14} />
                      CODE EDITOR (Arduino C++)
                  </div>
              </div>
              <div className="flex-1 flex overflow-hidden">
                  <textarea 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 bg-white p-4 font-mono text-sm text-slate-700 resize-none focus:outline-none"
                    spellCheck={false}
                  />
                  <div className="w-1/3 border-l border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-500 overflow-y-auto">
                      <div className="mb-2 font-bold text-slate-400 uppercase tracking-wider">Serial Monitor</div>
                      {logs.map((log, i) => (
                          <div key={i} className="mb-1 border-b border-slate-100 pb-0.5">{log}</div>
                      ))}
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};

export default MakerSpace;
