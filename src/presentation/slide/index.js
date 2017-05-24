/** @jsx h */
import { h } from '../../utils/dom.js';

document.head.append(<style>{require('static-module').inlineSass(__dirname + '/style.scss')}</style>);

function rafPromise() {
  return new Promise(r => requestAnimationFrame(r));
}

export default class Slide extends HTMLElement {
  constructor() {
    super();
    this._func = null;
    this._nextResolve = null;
    this._complete = false;
    this._preparePromises = [];
    this._currentStateNum = 0;
    this._autoAdvanceNum = 0;
    this._initialExecutionComplete = false;
    this.ready = Promise.resolve();
    this.transition = true;
  }

  async _run(func, {
    preventTransition = false,
    autoAdvanceNum = 0
  }={}) {
    this.transition = !preventTransition;
    this._autoAdvanceNum = autoAdvanceNum;
    
    const slideDone = func(this);
    this._initialExecutionComplete = true;
    
    await slideDone;
    this._complete = true;
  }
  
  _advance({
    preventTransition = false
  }={}) {
    this.transition = !preventTransition;
    if (this._nextResolve) this._nextResolve();
  }

  next() {
    if (this._nextResolve) throw Error('next() called before previous next had resolved – ensure you await slide.next()');

    return new Promise(resolve => {
      this._nextResolve = resolve;
      if (this._autoAdvanceNum) {
        this._autoAdvanceNum--;
        resolve();
      }
    }).then(() => {
      this._currentStateNum++;
      this._nextResolve = null;
      this._preparePromises = [Promise.all(this._preparePromises)];
    });
  }

  async prepare(promise = undefined) {
    const preparePromises = this._preparePromises;
    
    if (promise) {
      const caughtPromise = promise.catch(err => {
        // Don't rethrow the error, just log
        console.error('Prepare promise rejected', err);
      }); 
      
      preparePromises.push(caughtPromise);

      if (!this._initialExecutionComplete) {
        this.ready = this.ready.then(() => caughtPromise);
      }
    }

    await rafPromise();

    return Promise.all(preparePromises);
  }
}

customElements.define('preso-slide', Slide);