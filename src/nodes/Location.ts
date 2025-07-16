export class Position {
  index: number;
  line: number;
  col: number;

  constructor(loc: { index: number; line: number; col: number }) {
    this.index = loc.index;
    this.line = loc.line;
    this.col = loc.col;
  }
}

export class Location {
  start: Position;
  end: Position;

  constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }

  slice(input: string): string {
    return input.slice(...this.range);
  }

  get range(): [number, number] {
    return [this.start.index, this.end.index];
  }

  get lines(): [number, number] {
    return [this.start.line, this.end.line];
  }
}

export const location = (loc: { index: number; line: number; col: number }) => {
  const start = new Position(loc);

  return (node: any) => {
    node.loc = new Location(start, new Position(loc));
    return node;
  };
};

location.Position = Position;
location.Location = Location;
location.location = location;

export default Location;
