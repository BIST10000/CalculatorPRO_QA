import { simulate } from './engine.js';
self.onmessage = ({data}) => {
  try { self.postMessage({result: simulate(data)}); }
  catch (error) { self.postMessage({error: error.message}); }
};
