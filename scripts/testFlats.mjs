import { transposeChord, convertNotation } from '../src/music/musicTheory.ts';

console.log('Testing Flats (preferFlats = true):');
console.log('C + 1 (flats):', transposeChord('C', 1, true));
console.log('C + 3 (flats):', transposeChord('C', 3, true));
console.log('C + 6 (flats):', transposeChord('C', 6, true));
console.log('C + 8 (flats):', transposeChord('C', 8, true));
console.log('C + 10 (flats):', transposeChord('C', 10, true));
console.log('F/G + 1 (flats):', transposeChord('F/G', 1, true));
console.log('C + 1 (latin flats):', transposeChord('C', 1, true, 'latin'));
console.log('F/G + 1 (latin flats):', transposeChord('F/G', 1, true, 'latin'));

console.log('\nTesting Sharps (preferFlats = false):');
console.log('C + 1 (sharps):', transposeChord('C', 1, false));
console.log('C + 3 (sharps):', transposeChord('C', 3, false));
console.log('C + 6 (sharps):', transposeChord('C', 6, false));
console.log('C + 8 (sharps):', transposeChord('C', 8, false));
console.log('C + 10 (sharps):', transposeChord('C', 10, false));
console.log('F/G + 1 (sharps):', transposeChord('F/G', 1, false));
