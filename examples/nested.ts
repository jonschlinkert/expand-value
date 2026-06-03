import expand from '../index';

const data = {
  config: { theme: 'dark' },
  themes: {
    dark: { background: 'black', text: 'white' },
    light: { background: 'white', text: 'black' }
  },
  setting: 'theme'
};

console.log(expand(data, 'setting')); //=> 'theme'
console.log(expand(data, 'config[setting]')); //=> 'dark'
console.log(expand(data, 'themes[config[setting]]')); //=> '{ background: "black", text: "white" }'
console.log(expand(data, 'themes[config[setting]].background')); //=> 'black'
console.log(expand(data, 'themes[config[setting]].text')); //=> 'white'
