export function makeCanvasFileContentString(): string {
  return `{
    "nodes":[
      {"type":"group","id":"1c5117d1307305de","x":-860,"y":0,"width":280,"height":260,"label":"Untitled group"},
      {"type":"link","url":"https://www.google.com/","id":"96c6998a8d8f59a2","x":-280,"y":254,"width":361,"height":302},
      {"type":"file","file":"Obsidian Help/Panes/Linked pane.md","subpath":"","id":"2064cbfa833c2832","x":-512,"y":-460,"width":400,"height":300,"color":"1"},
      {"type":"text","text":"third card","id":"af9a85dc5427b35f","x":-880,"y":375,"width":250,"height":60},
      {"type":"file","file":"symbolsearch.png","id":"13051a00708aaedb","x":-880,"y":-540,"width":348,"height":400},
      {"type":"text","text":"secon card","id":"83db5142f3dd314f","x":-800,"y":180,"width":200,"height":60,"color":"2"},
      {"type":"text","text":"first card","id":"66d5f6bd0f80963d","x":-840,"y":40,"width":200,"height":50}
    ],
    "edges":[
      {"id":"2748f2636825369f","fromNode":"66d5f6bd0f80963d","fromSide":"bottom","toNode":"83db5142f3dd314f","toSide":"left"}
    ]
  }`;
}
