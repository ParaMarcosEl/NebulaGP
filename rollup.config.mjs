// rollup.config.js
import path from 'path';
import { partytownRollup } from '@qwik.dev/partytown/utils';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  plugins: [
    partytownRollup({
      dest: path.join(__dirname, 'dist', '~partytown'),
    }),
  ],
};
