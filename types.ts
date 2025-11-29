
export enum ProjectionType {
  CHART_BAR = 'chart_bar',
  CHART_LINE = 'chart_line',
  LIST = 'list',
  STAT_CARD = 'stat_card',
  TEXT_SUMMARY = 'text_summary',
  IMAGE = 'image',
  TECHNICAL_SVG = 'technical_svg',
  HOLOGRAM_3D = 'hologram_3d',
  NEWS_FEED = 'news_feed',
  NONE = 'none'
}

export interface ProjectionData {
  title: string;
  type: ProjectionType;
  data: any; // Flexible data payload depending on type
  description?: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
}

export interface ToolCallResponse {
  id: string;
  name: string;
  response: { result: string };
}

export type ComponentType = 
  | 'arduino_uno' 
  | 'breadboard_small' 
  | 'led' 
  | 'resistor' 
  | 'push_button' 
  | 'potentiometer'
  | 'servo' 
  | 'motor_dc' 
  | 'battery_9v' 
  | 'lcd_16x2' 
  | 'ultrasonic';

export interface PinDefinition {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface MakerComponent {
  id: string;
  type: ComponentType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  properties: {
    color?: string;
    value: number;
  };
}

export interface Wire {
  id: string;
  sourceId: string;
  sourcePin: string;
  targetId: string;
  targetPin: string;
  color: string;
}
