'use strict';

class Position {
  constructor(loc) {
    this.index = loc.index;
    this.line = loc.line;
    this.col = loc.col;
  }
}

class Location {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  slice(input) {
    return input.slice(...this.range);
  }
  get range() {
    return [this.start.index, this.end.index];
  }
  get lines() {
    return [this.start.line, this.end.line];
  }
}

const location = loc => {
  const start = new Position(loc);

  return node => {
    node.loc = new Location(start, new Position(loc));
    return node;
  };
};

location.Position = Position;
location.Location = Location;
location.location = location;
module.exports = location;
