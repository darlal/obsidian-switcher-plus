export * from 'obsidian/canvas';

declare module 'obsidian/canvas' {
  // TODO: remove this when the Obsidian module release is updated as this is already define https://github.com/obsidianmd/obsidian-api/blob/master/canvas.d.ts#L51
  export interface CanvasGroupData extends CanvasNodeData {
    type: 'group';
    // Optional label to display on top of the group.
    label?: string;
  }

  // TODO: remove this when the Obsidian module release is updated as this is already define https://github.com/obsidianmd/obsidian-api/blob/master/canvas.d.ts#L25
  export type AllCanvasNodeData =
    | CanvasFileData
    | CanvasTextData
    | CanvasLinkData
    | CanvasGroupData;
}
