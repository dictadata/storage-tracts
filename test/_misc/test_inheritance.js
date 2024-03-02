function CustomShape(id) {
  this.id = id;
}
CustomShape.prototype.name = 'Shape';
CustomShape.prototype.toString = function() {
  return this.name;
};

function SquareShape(id, name, side) {
  CustomShape.apply(this, [id]);
  this.name = name;
  this.side = side;
}
SquareShape.prototype = new CustomShape();
SquareShape.prototype.name = 'Square';

function CircleShape(id, name, rad) {
  CustomShape.apply(this, [id]);
  this.name = name;
  this.rad = rad;
}
CircleShape.prototype = new CustomShape();
CircleShape.prototype.name = 'Circle';

console.log(new CustomShape(1));
console.log(new SquareShape(2, "two", 4));
console.log(new CircleShape(3, "three", 180));


////////////////////////////////////////

class Engram extends Object {
  constructor(value) {
    super(value);
    this.valueA = value;
  }
}

class Entry {
  constructor(value) {
    this.realm = "foo";
  }
}

class CEngram extends Engram {
  constructor(value) {
    super(value);
  }
}

Object.setPrototypeOf(Engram, Entry);
Object.setPrototypeOf(Engram.prototype, Entry.prototype);

let ceng = new CEngram(5);
console.log(ceng);
console.log(ceng instanceof CEngram);
console.log(ceng instanceof Engram);
console.log(ceng instanceof Entry);

function creat(value) {
  return Reflect.construct(Engram, [ value ]);
}

let feng = creat(7);
console.log(feng);
console.log(feng instanceof CEngram);
console.log(feng instanceof Engram);
console.log(feng instanceof Entry);
