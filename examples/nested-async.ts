import expand from '../src/async/expand';

async function main() {
  const data = {
    config: Promise.resolve({ theme: 'dark' }),
    themes: Promise.resolve({
      dark: Promise.resolve({ background: 'black', text: 'white' }),
      light: Promise.resolve({ background: 'white', text: 'black' })
    }),
    setting: Promise.resolve('theme')
  };

  console.log(await expand(data, 'setting')); //=> 'theme'
  console.log(await expand(data, 'config[setting]')); //=> 'dark'
  console.log(await expand(data, 'themes[config[setting]]')); //=> '{ background: "black", text: "white" }'
  console.log(await expand(data, 'themes[config[setting]].background')); //=> 'black'
  console.log(await expand(data, 'themes[config[setting]].text')); //=> 'white'
}

main().catch(console.error);
