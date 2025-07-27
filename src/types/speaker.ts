// types/speaker.ts

export type Speakers = Array<{
  uuid: string;
  name: string;
  styles: Array<{
    name: string;
    uuid: string;
  }>;
}>;
