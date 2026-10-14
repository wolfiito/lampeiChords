import type { Song } from '../types/song'

export const DEFAULT_SONGS: Song[] = [
  {
    id: 'por-encima-del-sol',
    title: 'Por Encima del Sol',
    artist: 'Canción',
    originalKey: 'G',
    currentKey: 'G',
    capo: 0,
    tempo: 100,
    timeSignature: '4/4',
    tags: ['Favoritos', 'Alabanza'],
    createdAt: Date.now() - 600000,
    updatedAt: Date.now() - 600000,
    content: `{title: Por Encima del Sol}
{artist: Canción}
{key: G}
{tempo: 100}

[Intro]
[G]  [D]  [C]  [G]

[Verso 1]
Por encima del so[G]l, hay una vista rea[D]l
De allá la vida se pu[C]ede ver, como es en verd[G]ad
Una visión celestial, de todo lo terrenal[D]
Toda la historia se v[C]e a la luz, de la eternid[G]ad

[Estribillo 1]
[C] [G] [D]
Quiero fijar mis ojos mucho más allá de lo que puedo ver
[C] [G] [D]
Miles de páginas me sirven de ventana para andar por fe
[C] [G]
Mi Dios está en su trono y lo gobierna todo
[D] [Em]
Puedo yo confiar pues soberano es él
Pueden subir las agua[C]s, firme está mi al[G]ma cuando puedo v[D]er

[Interludio]
[C] [G] [Em] [D]
Por encima del sol
[C] [G] [D]
Por encima del sol

[Verso 2]
Por encima del so[G]l, se puede ver redenci[D]ón
Todo lo viejo cam[C]biando por, una nueva c[G]reación
La más profunda aflicción, luego se vuelve una nu[D]eva canción
[C] [G]
Cuando yo puedo un destello ver de la gloria de Dios

[Estribillo 2]
[C] [G] [D]
Quiero fijar mis ojos mucho más allá de lo que puedo ver
[C] [G] [D]
Miles de páginas me sirven de ventana para andar por fe
[C] [G]
Mi Dios está en su trono y lo gobierna todo
[D] [Em]
Puedo yo confiar pues soberano es él
Pueden subir las agu[C]as, firme está mi al[G]ma cuando puedo v[D]er

[Interludio]
[C] [G] [Em] [D]
Por encima del sol
[C] [G] [D]
Por encima del sol

[Puente]
Puedo pasar por el fue[C]go, que soplen los vie[G]ntos, se agiten [D]los mares
Pues no hay sufr[Em]imiento, que no de buen fr[C]uto de vida a su [G]tiempo [D]
Mientras espero

Puedo pasar por el fue[C]go, que soplen los vie[G]ntos, se agiten [D]los mares
Pues no hay sufrim[Em]iento, que no de buen f[C]ruto de vida a su [G]tiempo [D]
Mientras espero

[Final]
[C] [G] [D]
Quiero fijar mis ojos mucho más allá de lo que puedo ver
[C] [G] [D]
Miles de páginas me sirven de ventana para andar por fe
[C] [G]
Mi Dios está en su trono y lo gobierna todo
[D] [Em]
Puedo yo confiar pues soberano es él
Pueden subir las agu[C]as, firme está mi al[G]ma cuando puedo v[D]er

[Outro]
[C] [G] [Em] [D]
Por encima del sol
[C] [G] [D]
Por encima del sol`
  },
  {
    id: 'soda-stereo-de-musica-ligera',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    originalKey: 'Bm',
    currentKey: 'Bm',
    capo: 0,
    tempo: 125,
    timeSignature: '4/4',
    tags: ['Rock en Español', 'Clásicos'],
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 500000,
    content: `{title: De Música Ligera}
{artist: Soda Stereo}
{key: Bm}
{tempo: 125}

[Intro]
[Bm]  [G]  [D]  [A]  (x4)

[Verso 1]
[Bm] Ella dur[G]mió
al ca[D]lor de las [A]masas
[Bm] y yo des[G]perté
que[D]riendo so[A]ñarla.
[Bm] Algún tiempo a[G]trás
pen[D]sé en escri[A]birle
[Bm] que nunca sor[G]teé
las [D]trampas del [A]amor.

[Coro]
[Bm] De a[G]quel a[D]mor
[A] de música li[Bm]gera,
[G] nada nos li[D]bra,
[A] nada más que[Bm]da. [G]  [D]  [A]

[Verso 2]
[Bm] No le en[G]vié
las ce[D]nizas de [A]rosas,
[Bm] ni quise e[G]vitar
el [D]roce de un se[A]creto.

[Coro]
[Bm] De a[G]quel a[D]mor
[A] de música li[Bm]gera,
[G] nada nos li[D]bra,
[A] nada más que[Bm]da.`
  },
  {
    id: 'ben-e-king-stand-by-me',
    title: 'Stand By Me',
    artist: 'Ben E. King',
    originalKey: 'A',
    currentKey: 'A',
    capo: 2,
    tempo: 118,
    timeSignature: '4/4',
    tags: ['Soul', 'Clásicos', 'Inglés'],
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 400000,
    content: `{title: Stand By Me}
{artist: Ben E. King}
{key: A}
{capo: 2}
{tempo: 118}

[Intro]
[A]  [F#m]  [D]  [E]  [A]

[Verso 1]
When the [A]night has come
and the [F#m]land is dark
and the [D]moon is the [E]only light we'll [A]see.
No, I [A]won't be afraid,
oh, I [F#m]won't be afraid
just as [D]long as you [E]stand, stand by [A]me.

[Coro]
So darling, darling, [A]stand by me,
oh, [F#m]stand by me.
Oh, [D]stand, [E]stand by me,
[A]stand by me.`
  }
]
