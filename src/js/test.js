const ready = require('./utils/documentReady');

ready(function() {
  console.log('Ready');

  const promise = new Promise(() => console.log('resolve promise'));
});
