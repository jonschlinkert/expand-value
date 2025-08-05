import expand from '..';

const data = { items: ['a', 'b', 'c', 'd', 'e'] };

console.log(expand(data, 'items[1..3]'));
