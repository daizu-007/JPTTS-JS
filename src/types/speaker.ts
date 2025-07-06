// types/speaker.ts

export type Speakers = Array<{
  id: number;
  name: string;
  styles: Array<{
    name: string;
    id: number;
  }>;
}>;
